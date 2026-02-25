use serde::Deserialize;
use std::process::Command;
use web_elements::template::*;

#[allow(non_snake_case)]
#[derive(Deserialize)]
struct Templates {
  templateScrollView: String,
  templateXAudioTT: String,
  templateXImage_none: String,
  templateXImage_some: String,
  templateXInput: String,
  templateXList: String,
  templateXOverlayNg: String,
  templateXRefreshView: String,
  templateXSwiper: String,
  templateXText: String,
  templateXTextarea: String,
  templateXViewpageNg: String,
  templateXWebView: String,
  templateXSvg: String,
}

#[test]
fn test_template_sync() {
  let script = r#"
        import('./dist/elements/htmlTemplates.js').then(templates => {
            console.log(JSON.stringify({
                templateScrollView: templates.templateScrollView,
                templateXAudioTT: templates.templateXAudioTT,
                templateXImage_none: templates.templateXImage({}),
                templateXImage_some: templates.templateXImage({src: 'https://example.com/a.png'}),
                templateXInput: templates.templateXInput,
                templateXList: templates.templateXList,
                templateXOverlayNg: templates.templateXOverlayNg,
                templateXRefreshView: templates.templateXRefreshView,
                templateXSwiper: templates.templateXSwiper,
                templateXText: templates.templateXText,
                templateXTextarea: templates.templateXTextarea,
                templateXViewpageNg: templates.templateXViewpageNg,
                templateXWebView: templates.templateXWebView,
                templateXSvg: templates.templateXSvg(),
            }));
        }).catch(err => {
            console.error(err);
            process.exit(1);
        });
    "#;

  // Connect to the node environment via bash to ensure we pick up the user's configuration
  let output = Command::new("bash")
    .arg("-l")
    .arg("-c")
    .arg("node -e \"$1\"")
    .arg("--")
    .arg(script)
    .output()
    .expect("Failed to execute bash");

  assert!(
    output.status.success(),
    "Node script failed: {}",
    String::from_utf8_lossy(&output.stderr)
  );

  let json_str = String::from_utf8(output.stdout).unwrap();
  let ts_templates: Templates = serde_json::from_str(&json_str).expect("Failed to parse JSON");

  assert_eq!(TEMPLATE_SCROLL_VIEW, ts_templates.templateScrollView);
  assert_eq!(TEMPLATE_X_AUDIO_TT, ts_templates.templateXAudioTT);
  assert_eq!(
    template_x_image(None).unwrap(),
    ts_templates.templateXImage_none
  );
  assert_eq!(
    template_x_image(Some("https://example.com/a.png")).unwrap(),
    ts_templates.templateXImage_some
  );

  // Test the XSS error locally in Rust
  assert!(template_x_image(Some("<script>")).is_err());
  assert!(template_x_image(Some("  <  script")).is_err());

  assert_eq!(TEMPLATE_X_INPUT, ts_templates.templateXInput);
  assert_eq!(TEMPLATE_X_LIST, ts_templates.templateXList);
  assert_eq!(TEMPLATE_X_OVERLAY_NG, ts_templates.templateXOverlayNg);
  assert_eq!(TEMPLATE_X_REFRESH_VIEW, ts_templates.templateXRefreshView);
  assert_eq!(TEMPLATE_X_SWIPER, ts_templates.templateXSwiper);
  assert_eq!(TEMPLATE_X_TEXT, ts_templates.templateXText);
  assert_eq!(TEMPLATE_X_TEXTAREA, ts_templates.templateXTextarea);
  assert_eq!(TEMPLATE_X_VIEWPAGE_NG, ts_templates.templateXViewpageNg);
  assert_eq!(TEMPLATE_X_WEB_VIEW, ts_templates.templateXWebView);
  assert_eq!(template_x_svg(), ts_templates.templateXSvg);
}
