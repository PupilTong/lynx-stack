// Copyright 2026 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

//! Volcengine TOS storage for screenshot results.
//!
//! The server uploads each captured BMP to TOS and returns the object's public
//! URL instead of the image bytes. Configuration deliberately reuses the
//! environment variable names of GenUI Server's `app/common/tos-storage.ts`, so
//! one set of credentials configures both services. Uploads are signed with
//! TOS's `TOS4-HMAC-SHA256` scheme (the same algorithm as `@volcengine/tos-sdk`)
//! and use `UNSIGNED-PAYLOAD`, so the image is never hashed in memory.

use std::fmt;
use std::sync::Arc;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use hmac::{Hmac, KeyInit, Mac};
use reqwest::header::{HeaderValue, AUTHORIZATION, CACHE_CONTROL, CONTENT_TYPE};
use sha2::{Digest, Sha256};
use thiserror::Error;
use uuid::Uuid;

const DEFAULT_SCREENSHOT_PREFIX: &str = "screenshot";
const SCREENSHOT_FILE: &str = "screenshot.bmp";
const SCREENSHOT_CONTENT_TYPE: &str = "image/bmp";
// Matches GenUI Server's uploadTosObject cache policy.
const OBJECT_CACHE_CONTROL: &str = "public, max-age=1800";
const SIGNING_ALGORITHM: &str = "TOS4-HMAC-SHA256";
const SERVICE_NAME: &str = "tos";
const UNSIGNED_PAYLOAD: &str = "UNSIGNED-PAYLOAD";
const CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const UPLOAD_TIMEOUT: Duration = Duration::from_secs(30);
const MAX_ERROR_BODY_CHARS: usize = 512;

/// Environment variables that must all be set for screenshots to be stored.
const REQUIRED_VARIABLES: [&str; 4] = [
  "TOS_ACCESS_KEY",
  "TOS_SECRET_KEY",
  "TOS_BUCKET",
  "TOS_REGION",
];

#[derive(Debug, Error, PartialEq, Eq)]
pub enum TosConfigError {
  #[error("missing required TOS environment variables: {}", .0.join(", "))]
  Missing(Vec<&'static str>),
  #[error("TOS_ENDPOINT must be an HTTP(S) endpoint host")]
  InvalidEndpoint,
  #[error("TOS_SCREENSHOT_STORAGE_PREFIX must not contain empty, \".\", or \"..\" path segments")]
  InvalidPrefix,
  #[error("the TOS HTTP client could not be created")]
  HttpClient,
}

#[derive(Debug, Error)]
pub(crate) enum TosUploadError {
  #[error("TOS request failed: {0}")]
  Transport(String),
  #[error("TOS rejected the upload with HTTP {status}: {body}")]
  Rejected { status: u16, body: String },
}

/// Credentials and addressing for one TOS bucket.
#[derive(Clone)]
pub(crate) struct TosConfig {
  access_key: String,
  secret_key: String,
  security_token: Option<String>,
  bucket: String,
  region: String,
  secure: bool,
  /// `host` or `host:port`, exactly as `URL.host` renders it in GenUI Server.
  endpoint_host: String,
  /// Slash-trimmed key prefix; empty stores objects at the bucket root.
  prefix: String,
}

impl fmt::Debug for TosConfig {
  fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
    f.debug_struct("TosConfig")
      .field("bucket", &self.bucket)
      .field("region", &self.region)
      .field("endpoint_host", &self.endpoint_host)
      .field("prefix", &self.prefix)
      .finish_non_exhaustive()
  }
}

impl TosConfig {
  /// Reads the configuration with the variable names, trimming, and endpoint
  /// rules of GenUI Server's `resolveTosStorageConfig`, except that missing
  /// credentials are an error instead of silently disabling storage.
  pub(crate) fn from_env() -> Result<Self, TosConfigError> {
    Self::from_lookup(|name| std::env::var(name).ok())
  }

  fn from_lookup(lookup: impl Fn(&str) -> Option<String>) -> Result<Self, TosConfigError> {
    let read = |name: &str| {
      lookup(name)
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
    };
    let missing: Vec<&'static str> = REQUIRED_VARIABLES
      .into_iter()
      .filter(|name| read(name).is_none())
      .collect();
    if !missing.is_empty() {
      return Err(TosConfigError::Missing(missing));
    }
    let region = read("TOS_REGION").expect("checked above");
    let endpoint = read("TOS_ENDPOINT").unwrap_or_else(|| format!("tos-{region}.volces.com"));
    let (secure, endpoint_host) = parse_endpoint(&endpoint)?;
    let prefix = normalize_prefix(
      &read("TOS_SCREENSHOT_STORAGE_PREFIX").unwrap_or_else(|| DEFAULT_SCREENSHOT_PREFIX.into()),
    )?;
    let config = Self {
      access_key: read("TOS_ACCESS_KEY").expect("checked above"),
      secret_key: read("TOS_SECRET_KEY").expect("checked above"),
      security_token: read("TOS_SECURITY_TOKEN"),
      bucket: read("TOS_BUCKET").expect("checked above"),
      region,
      secure,
      endpoint_host,
      prefix,
    };
    // Reject bucket names or endpoints that cannot form a request URL now,
    // instead of failing every upload later.
    reqwest::Url::parse(&config.object_url("/probe"))
      .map_err(|_| TosConfigError::InvalidEndpoint)?;
    Ok(config)
  }

  fn object_key(&self, id: &Uuid) -> String {
    if self.prefix.is_empty() {
      format!("{id}/{SCREENSHOT_FILE}")
    } else {
      format!("{}/{id}/{SCREENSHOT_FILE}", self.prefix)
    }
  }

  /// Host of the virtual-hosted-style bucket endpoint, as sent in `Host`.
  fn bucket_host(&self) -> String {
    format!("{}.{}", self.bucket, self.endpoint_host)
  }

  /// Unsigned public object URL. Reads are governed by the bucket policy.
  fn object_url(&self, path: &str) -> String {
    let scheme = if self.secure { "https" } else { "http" };
    format!("{scheme}://{}{path}", self.bucket_host())
  }

  /// `TOS4-HMAC-SHA256` authorization for a query-less `PUT` whose payload is
  /// unsigned. Only `host` and the `x-tos-*` headers are signed, like the SDK.
  fn authorization(&self, host: &str, path: &str, datetime: &str) -> String {
    let date = &datetime[..8];
    let mut headers = vec![
      ("host", host),
      ("x-tos-content-sha256", UNSIGNED_PAYLOAD),
      ("x-tos-date", datetime),
    ];
    if let Some(token) = &self.security_token {
      headers.push(("x-tos-security-token", token));
    }
    let signed_headers = headers
      .iter()
      .map(|(name, _)| *name)
      .collect::<Vec<_>>()
      .join(";");
    let canonical_headers = headers
      .iter()
      .map(|(name, value)| format!("{name}:{}", value.trim()))
      .collect::<Vec<_>>()
      .join("\n");
    let canonical_request =
      format!("PUT\n{path}\n\n{canonical_headers}\n\n{signed_headers}\n{UNSIGNED_PAYLOAD}");
    let scope = format!("{date}/{}/{SERVICE_NAME}/request", self.region);
    let string_to_sign = format!(
      "{SIGNING_ALGORITHM}\n{datetime}\n{scope}\n{}",
      hex::encode(Sha256::digest(canonical_request.as_bytes())),
    );
    let date_key = hmac_sha256(self.secret_key.as_bytes(), date.as_bytes());
    let region_key = hmac_sha256(&date_key, self.region.as_bytes());
    let service_key = hmac_sha256(&region_key, SERVICE_NAME.as_bytes());
    let signing_key = hmac_sha256(&service_key, b"request");
    let signature = hex::encode(hmac_sha256(&signing_key, string_to_sign.as_bytes()));
    format!(
      "{SIGNING_ALGORITHM} Credential={}/{scope}, SignedHeaders={signed_headers}, Signature={signature}",
      self.access_key,
    )
  }
}

fn hmac_sha256(key: &[u8], data: &[u8]) -> Vec<u8> {
  let mut mac =
    <Hmac<Sha256> as KeyInit>::new_from_slice(key).expect("HMAC accepts any key length");
  mac.update(data);
  mac.finalize().into_bytes().to_vec()
}

/// Mirrors `parseTosEndpoint`: a bare host means HTTPS, and only a plain
/// `scheme://host[:port]` origin is accepted.
fn parse_endpoint(endpoint: &str) -> Result<(bool, String), TosConfigError> {
  let has_scheme = endpoint.split_once("://").is_some_and(|(scheme, _)| {
    scheme.starts_with(|c: char| c.is_ascii_alphabetic())
      && scheme
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '+' | '.' | '-'))
  });
  let url = reqwest::Url::parse(&if has_scheme {
    endpoint.to_string()
  } else {
    format!("https://{endpoint}")
  })
  .map_err(|_| TosConfigError::InvalidEndpoint)?;
  if !matches!(url.scheme(), "http" | "https")
    || !url.username().is_empty()
    || url.password().is_some()
    || url.path() != "/"
    || url.query().is_some()
    || url.fragment().is_some()
  {
    return Err(TosConfigError::InvalidEndpoint);
  }
  let host = url.host_str().ok_or(TosConfigError::InvalidEndpoint)?;
  let endpoint_host = match url.port() {
    Some(port) => format!("{host}:{port}"),
    None => host.to_string(),
  };
  Ok((url.scheme() == "https", endpoint_host))
}

/// Trims surrounding slashes like `trimSlashes`, then rejects segments that
/// URL normalization would rewrite and thereby invalidate the signed path.
fn normalize_prefix(prefix: &str) -> Result<String, TosConfigError> {
  let prefix = prefix.trim_matches('/');
  if prefix.is_empty() {
    return Ok(String::new());
  }
  if prefix
    .split('/')
    .any(|segment| matches!(segment, "" | "." | ".."))
  {
    return Err(TosConfigError::InvalidPrefix);
  }
  Ok(prefix.to_string())
}

/// Percent-encodes every key segment with only RFC 3986 unreserved characters
/// left literal, so the signed path equals the path sent on the wire.
fn object_path(key: &str) -> String {
  let mut path = String::with_capacity(key.len() + 1);
  for segment in key.split('/') {
    path.push('/');
    for byte in segment.bytes() {
      if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'.' | b'_' | b'~') {
        path.push(byte as char);
      } else {
        path.push_str(&format!("%{byte:02X}"));
      }
    }
  }
  path
}

/// `YYYYMMDDTHHMMSSZ`, the `X-Tos-Date` format.
fn format_datetime(time: SystemTime) -> String {
  let seconds = time
    .duration_since(UNIX_EPOCH)
    .map(|elapsed| elapsed.as_secs() as i64)
    .unwrap_or(0);
  let (year, month, day) = civil_from_days(seconds.div_euclid(86_400));
  let of_day = seconds.rem_euclid(86_400);
  format!(
    "{year:04}{month:02}{day:02}T{:02}{:02}{:02}Z",
    of_day / 3_600,
    of_day % 3_600 / 60,
    of_day % 60,
  )
}

/// Days since 1970-01-01 to a proleptic Gregorian (year, month, day).
fn civil_from_days(days: i64) -> (i64, i64, i64) {
  let shifted = days + 719_468;
  let era = shifted.div_euclid(146_097);
  let day_of_era = shifted.rem_euclid(146_097);
  let year_of_era =
    (day_of_era - day_of_era / 1_460 + day_of_era / 36_524 - day_of_era / 146_096) / 365;
  let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
  let month_index = (5 * day_of_year + 2) / 153;
  let day = day_of_year - (153 * month_index + 2) / 5 + 1;
  let month = if month_index < 10 {
    month_index + 3
  } else {
    month_index - 9
  };
  let year = year_of_era + era * 400 + i64::from(month <= 2);
  (year, month, day)
}

struct TosUploader {
  client: reqwest::Client,
  config: TosConfig,
}

impl TosUploader {
  fn new(config: TosConfig) -> Result<Self, TosConfigError> {
    let client = reqwest::Client::builder()
      // A redirect would resend the request without a valid signature.
      .redirect(reqwest::redirect::Policy::none())
      .connect_timeout(CONNECT_TIMEOUT)
      .timeout(UPLOAD_TIMEOUT)
      .build()
      .map_err(|_| TosConfigError::HttpClient)?;
    Ok(Self { client, config })
  }

  async fn put_bmp(&self, bmp: Vec<u8>) -> Result<String, TosUploadError> {
    let config = &self.config;
    let path = object_path(&config.object_key(&Uuid::new_v4()));
    let url = config.object_url(&path);
    let datetime = format_datetime(SystemTime::now());
    let authorization = config.authorization(&config.bucket_host(), &path, &datetime);

    let mut request = self
      .client
      .put(&url)
      .header("x-tos-date", datetime)
      .header("x-tos-content-sha256", UNSIGNED_PAYLOAD)
      .header(CONTENT_TYPE, SCREENSHOT_CONTENT_TYPE)
      .header(CACHE_CONTROL, OBJECT_CACHE_CONTROL)
      .header(AUTHORIZATION, sensitive_header(&authorization)?);
    if let Some(token) = &config.security_token {
      request = request.header("x-tos-security-token", sensitive_header(token)?);
    }
    let response = request
      .body(bmp)
      .send()
      .await
      .map_err(|error| TosUploadError::Transport(error.without_url().to_string()))?;
    let status = response.status();
    if status.is_success() {
      return Ok(url);
    }
    let body = response.text().await.unwrap_or_default();
    Err(TosUploadError::Rejected {
      status: status.as_u16(),
      body: body.chars().take(MAX_ERROR_BODY_CHARS).collect(),
    })
  }
}

fn sensitive_header(value: &str) -> Result<HeaderValue, TosUploadError> {
  let mut value = HeaderValue::from_str(value)
    .map_err(|_| TosUploadError::Transport("invalid TOS credential header".into()))?;
  value.set_sensitive(true);
  Ok(value)
}

/// Where finished screenshots go. Production always uses TOS; unit tests swap
/// in an in-memory store so route behavior needs no network.
#[derive(Clone)]
pub(crate) struct ScreenshotStore {
  backend: Arc<Backend>,
}

enum Backend {
  Tos(TosUploader),
  #[cfg(test)]
  Memory(memory::MemoryStore),
}

impl ScreenshotStore {
  pub(crate) fn from_env() -> Result<Self, TosConfigError> {
    Self::from_config(TosConfig::from_env()?)
  }

  fn from_config(config: TosConfig) -> Result<Self, TosConfigError> {
    Ok(Self {
      backend: Arc::new(Backend::Tos(TosUploader::new(config)?)),
    })
  }

  /// Stores one BMP and returns its public URL.
  pub(crate) async fn put_bmp(&self, bmp: Vec<u8>) -> Result<String, TosUploadError> {
    match self.backend.as_ref() {
      Backend::Tos(uploader) => uploader.put_bmp(bmp).await,
      #[cfg(test)]
      Backend::Memory(store) => store.put_bmp(bmp),
    }
  }
}

#[cfg(test)]
mod memory {
  use std::sync::Mutex;

  use super::{Backend, ScreenshotStore, TosConfig, TosUploadError};
  use std::sync::Arc;

  pub(super) struct MemoryStore {
    config: TosConfig,
    fail_with_status: Option<u16>,
    objects: Mutex<Vec<(String, Vec<u8>)>>,
  }

  impl MemoryStore {
    pub(super) fn put_bmp(&self, bmp: Vec<u8>) -> Result<String, TosUploadError> {
      if let Some(status) = self.fail_with_status {
        return Err(TosUploadError::Rejected {
          status,
          body: "simulated TOS failure".into(),
        });
      }
      let mut objects = self.objects.lock().unwrap();
      let id = uuid::Uuid::from_u128(objects.len() as u128 + 1);
      let path = super::object_path(&self.config.object_key(&id));
      let url = self.config.object_url(&path);
      objects.push((url.clone(), bmp));
      Ok(url)
    }
  }

  impl ScreenshotStore {
    pub(crate) fn in_memory() -> Self {
      Self::memory(None)
    }

    pub(crate) fn failing_with_status(status: u16) -> Self {
      Self::memory(Some(status))
    }

    fn memory(fail_with_status: Option<u16>) -> Self {
      let config = TosConfig::from_lookup(|name| {
        match name {
          "TOS_ACCESS_KEY" => Some("test-access-key"),
          "TOS_SECRET_KEY" => Some("test-secret-key"),
          "TOS_BUCKET" => Some("screenshots"),
          "TOS_REGION" => Some("cn-beijing"),
          _ => None,
        }
        .map(str::to_string)
      })
      .expect("test TOS configuration is valid");
      Self {
        backend: Arc::new(Backend::Memory(MemoryStore {
          config,
          fail_with_status,
          objects: Mutex::new(Vec::new()),
        })),
      }
    }

    /// Every stored `(url, bmp)` pair, oldest first.
    pub(crate) fn stored_objects(&self) -> Vec<(String, Vec<u8>)> {
      match self.backend.as_ref() {
        Backend::Memory(store) => store.objects.lock().unwrap().clone(),
        Backend::Tos(_) => panic!("not an in-memory screenshot store"),
      }
    }
  }
}

#[cfg(test)]
mod tests {
  use std::collections::HashMap;
  use std::net::SocketAddr;
  use std::sync::Mutex;

  use axum::extract::{Request, State};
  use axum::http::StatusCode;
  use axum::routing::any;
  use axum::Router;

  use super::*;

  fn config(variables: &[(&str, &str)]) -> Result<TosConfig, TosConfigError> {
    let variables: HashMap<_, _> = variables.iter().copied().collect();
    TosConfig::from_lookup(|name| variables.get(name).map(|value| value.to_string()))
  }

  const BASE: [(&str, &str); 4] = [
    ("TOS_ACCESS_KEY", "AKTESTACCESSKEY"),
    ("TOS_SECRET_KEY", "SKTESTSECRETKEY"),
    ("TOS_BUCKET", "genui"),
    ("TOS_REGION", "cn-beijing"),
  ];

  fn with<'a>(extra: &[(&'a str, &'a str)]) -> Vec<(&'a str, &'a str)> {
    BASE.iter().chain(extra).copied().collect()
  }

  #[test]
  fn config_lists_every_missing_required_variable() {
    assert_eq!(
      config(&[("TOS_BUCKET", "genui"), ("TOS_SECRET_KEY", "  ")]).unwrap_err(),
      TosConfigError::Missing(vec!["TOS_ACCESS_KEY", "TOS_SECRET_KEY", "TOS_REGION"]),
    );
    assert_eq!(
      config(&[]).unwrap_err().to_string(),
      "missing required TOS environment variables: TOS_ACCESS_KEY, TOS_SECRET_KEY, TOS_BUCKET, TOS_REGION",
    );
  }

  #[test]
  fn config_defaults_match_genui_server() {
    let config = config(&BASE).unwrap();
    assert!(config.secure);
    assert_eq!(config.endpoint_host, "tos-cn-beijing.volces.com");
    assert_eq!(config.bucket_host(), "genui.tos-cn-beijing.volces.com");
    assert_eq!(config.prefix, "screenshot");
    assert_eq!(config.security_token, None);
  }

  #[test]
  fn config_reads_overrides_and_trims_values() {
    let config = config(&with(&[
      ("TOS_ENDPOINT", " http://tos.internal:8080 "),
      ("TOS_SECURITY_TOKEN", " sts "),
      ("TOS_SCREENSHOT_STORAGE_PREFIX", "/ui-judge/shots/"),
    ]))
    .unwrap();
    assert!(!config.secure);
    assert_eq!(config.endpoint_host, "tos.internal:8080");
    assert_eq!(config.security_token.as_deref(), Some("sts"));
    assert_eq!(config.prefix, "ui-judge/shots");
    assert_eq!(
      config.object_url("/ui-judge/shots/x/screenshot.bmp"),
      "http://genui.tos.internal:8080/ui-judge/shots/x/screenshot.bmp",
    );
  }

  #[test]
  fn config_accepts_bare_hosts_and_an_empty_prefix() {
    let config = config(&with(&[
      ("TOS_ENDPOINT", "tos-s3-cn-shanghai.volces.com"),
      ("TOS_SCREENSHOT_STORAGE_PREFIX", "//"),
    ]))
    .unwrap();
    assert!(config.secure);
    assert_eq!(config.endpoint_host, "tos-s3-cn-shanghai.volces.com");
    assert_eq!(
      config.object_key(&Uuid::from_u128(1)),
      "00000000-0000-0000-0000-000000000001/screenshot.bmp",
    );
  }

  #[test]
  fn config_rejects_endpoints_that_are_not_a_plain_origin() {
    for endpoint in [
      "ftp://tos.example.com",
      "https://user:pass@tos.example.com",
      "https://tos.example.com/bucket",
      "https://tos.example.com/?a=1",
      "https://tos.example.com/#frag",
      "https://",
      "bad host",
    ] {
      assert_eq!(
        config(&with(&[("TOS_ENDPOINT", endpoint)])).unwrap_err(),
        TosConfigError::InvalidEndpoint,
        "{endpoint}",
      );
    }
  }

  #[test]
  fn config_rejects_prefixes_that_url_normalization_would_rewrite() {
    for prefix in ["a/../b", "a//b", "./a", "a/."] {
      assert_eq!(
        config(&with(&[("TOS_SCREENSHOT_STORAGE_PREFIX", prefix)])).unwrap_err(),
        TosConfigError::InvalidPrefix,
        "{prefix}",
      );
    }
  }

  #[test]
  fn config_debug_never_prints_credentials() {
    let rendered = format!(
      "{:?}",
      config(&with(&[("TOS_SECURITY_TOKEN", "TOKEN-VALUE")])).unwrap()
    );
    for secret in ["AKTESTACCESSKEY", "SKTESTSECRETKEY", "TOKEN-VALUE"] {
      assert!(!rendered.contains(secret), "{rendered}");
    }
  }

  #[test]
  fn object_paths_encode_only_unreserved_characters() {
    assert_eq!(
      object_path("shots/0123-abcd/screenshot.bmp"),
      "/shots/0123-abcd/screenshot.bmp",
    );
    assert_eq!(
      object_path("a b/ü/(x)!*'~_.bmp"),
      "/a%20b/%C3%BC/%28x%29%21%2A%27~_.bmp",
    );
  }

  #[test]
  fn datetime_uses_the_tos_date_format() {
    let at = |seconds| format_datetime(UNIX_EPOCH + Duration::from_secs(seconds));
    assert_eq!(at(0), "19700101T000000Z");
    assert_eq!(at(951_782_400), "20000229T000000Z"); // leap day
    assert_eq!(at(1_791_785_210), "20261012T060650Z");
    assert_eq!(at(4_102_444_799), "20991231T235959Z");
  }

  // These vectors are real `Authorization` headers produced by
  // @volcengine/tos-sdk 2.9.1 `putObject` for the same inputs, captured from the
  // request it sent to a local server. They pin this signer to the SDK's.
  const SDK_KEY: &str = "screenshot/0123abcd-4567-89ef-0123-456789abcdef/screenshot.bmp";
  const SDK_DATETIME: &str = "20261012T060650Z";

  #[test]
  fn signature_matches_tos_sdk() {
    let config = config(&BASE).unwrap();
    assert_eq!(
      config.authorization("genui.localhost:55363", &object_path(SDK_KEY), SDK_DATETIME),
      "TOS4-HMAC-SHA256 Credential=AKTESTACCESSKEY/20261012/cn-beijing/tos/request, \
       SignedHeaders=host;x-tos-content-sha256;x-tos-date, \
       Signature=93da87d0dd66c60c1c3e9b40a38af60b01a85a43a9a0660ef0a37e74d6083dc5",
    );
  }

  #[test]
  fn signature_with_security_token_matches_tos_sdk() {
    let config = config(&with(&[("TOS_SECURITY_TOKEN", "STS-TOKEN-VALUE")])).unwrap();
    assert_eq!(
      config.authorization("genui.localhost:55365", &object_path(SDK_KEY), SDK_DATETIME),
      "TOS4-HMAC-SHA256 Credential=AKTESTACCESSKEY/20261012/cn-beijing/tos/request, \
       SignedHeaders=host;x-tos-content-sha256;x-tos-date;x-tos-security-token, \
       Signature=d60a53b7faf4636251873816c099327f188dd1c957d42627d91b93069018c8e8",
    );
  }

  struct Received {
    body: Vec<u8>,
    headers: axum::http::HeaderMap,
    method: String,
    path: String,
  }

  type Log = Arc<Mutex<Vec<Received>>>;

  /// A one-route stand-in for TOS that records requests and answers `status`.
  async fn fake_tos(status: StatusCode, reply: &'static str) -> (SocketAddr, Log) {
    async fn record(
      State((log, status, reply)): State<(Log, StatusCode, &'static str)>,
      request: Request,
    ) -> (StatusCode, &'static str) {
      let (parts, body) = request.into_parts();
      let body = axum::body::to_bytes(body, usize::MAX)
        .await
        .unwrap()
        .to_vec();
      log.lock().unwrap().push(Received {
        body,
        headers: parts.headers,
        method: parts.method.to_string(),
        path: parts.uri.path().to_string(),
      });
      (status, reply)
    }
    let log = Log::default();
    let app = Router::new()
      .fallback(any(record))
      .with_state((Arc::clone(&log), status, reply));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (address, log)
  }

  /// Routes `genui.localhost` to the fake without touching DNS or any proxy.
  fn uploader_for(address: SocketAddr, extra: &[(&str, &str)]) -> TosUploader {
    let endpoint = format!("http://localhost:{}", address.port());
    let mut variables = with(extra);
    variables.push(("TOS_ENDPOINT", endpoint.as_str()));
    let config = config(&variables).unwrap();
    let client = reqwest::Client::builder()
      .no_proxy()
      .redirect(reqwest::redirect::Policy::none())
      .resolve("genui.localhost", address)
      .build()
      .unwrap();
    TosUploader { client, config }
  }

  #[tokio::test]
  async fn upload_sends_a_signed_put_and_returns_the_public_url() {
    let (address, log) = fake_tos(StatusCode::OK, "").await;
    let uploader = uploader_for(address, &[("TOS_SECURITY_TOKEN", "STS-TOKEN-VALUE")]);

    let url = uploader.put_bmp(b"BM-pixels".to_vec()).await.unwrap();

    let received = log.lock().unwrap();
    let request = received.last().expect("the fake received one request");
    assert_eq!(request.method, "PUT");
    assert_eq!(request.body, b"BM-pixels");
    let host = format!("genui.localhost:{}", address.port());
    assert_eq!(url, format!("http://{host}{}", request.path));
    assert!(
      request.path.starts_with("/screenshot/") && request.path.ends_with("/screenshot.bmp"),
      "{}",
      request.path,
    );
    let header = |name: &str| request.headers[name].to_str().unwrap().to_string();
    assert_eq!(header("host"), host);
    assert_eq!(header("content-type"), "image/bmp");
    assert_eq!(header("cache-control"), "public, max-age=1800");
    assert_eq!(header("x-tos-content-sha256"), "UNSIGNED-PAYLOAD");
    assert_eq!(header("x-tos-security-token"), "STS-TOKEN-VALUE");
    assert!(!request.headers.contains_key("x-tos-acl"));
    // The server recomputes the signature from what it actually received.
    assert_eq!(
      header("authorization"),
      uploader
        .config
        .authorization(&host, &request.path, &header("x-tos-date")),
    );
  }

  #[tokio::test]
  async fn every_upload_gets_a_distinct_object_key() {
    let (address, _) = fake_tos(StatusCode::OK, "").await;
    let uploader = uploader_for(address, &[]);
    let first = uploader.put_bmp(vec![1]).await.unwrap();
    let second = uploader.put_bmp(vec![1]).await.unwrap();
    assert_ne!(first, second);
  }

  #[tokio::test]
  async fn upload_reports_tos_rejections_with_a_bounded_body() {
    let body: &'static str = Box::leak("x".repeat(4 * MAX_ERROR_BODY_CHARS).into_boxed_str());
    let (address, _) = fake_tos(StatusCode::FORBIDDEN, body).await;
    let error = uploader_for(address, &[])
      .put_bmp(vec![0])
      .await
      .unwrap_err();
    match error {
      TosUploadError::Rejected { status, body } => {
        assert_eq!(status, 403);
        assert_eq!(body.len(), MAX_ERROR_BODY_CHARS);
      }
      other => panic!("unexpected error: {other}"),
    }
  }

  #[tokio::test]
  async fn upload_does_not_follow_redirects() {
    let (address, log) = fake_tos(StatusCode::TEMPORARY_REDIRECT, "").await;
    let error = uploader_for(address, &[])
      .put_bmp(vec![0])
      .await
      .unwrap_err();
    assert!(matches!(
      error,
      TosUploadError::Rejected { status: 307, .. }
    ));
    assert_eq!(log.lock().unwrap().len(), 1);
  }

  #[tokio::test]
  async fn upload_reports_unreachable_endpoints_without_the_url() {
    // A port that was just released, so nothing is listening on it.
    let closed = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let dead = closed.local_addr().unwrap();
    drop(closed);
    match uploader_for(dead, &[]).put_bmp(vec![0]).await.unwrap_err() {
      TosUploadError::Transport(message) => {
        assert!(!message.contains("genui.localhost"), "{message}");
      }
      other => panic!("unexpected error: {other}"),
    }
  }
}
