#[macro_export]
macro_rules! str_to_u16_slice {
  ($s:expr) => {{
    const S: &str = $s;
    const LEN: usize = S.len();
    const fn make_array() -> [u16; LEN] {
      let bytes = S.as_bytes();
      let mut result = [0u16; LEN];
      let mut i = 0;
      while i < LEN {
        result[i] = bytes[i] as u16;
        i += 1;
      }
      result
    }
    const ARRAY: [u16; LEN] = make_array();
    &ARRAY
  }};
}

#[macro_export]
macro_rules! gen_attribute_selector {
  ($attr:expr, $value:expr) => {{
    let mut out: Vec<u16> = Vec::new();
    if let Some(val) = $value {
      out.push('[' as u16);
      out.extend_from_slice($attr);
      out.push('=' as u16);
      out.push('"' as u16);
      out.extend_from_slice(val);
      out.push('"' as u16);
    } else {
      out.push('[' as u16);
      out.extend_from_slice($attr);
      out.push(']' as u16);
    }
    out
  }};
}
