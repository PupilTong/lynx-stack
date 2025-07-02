mod constants;
pub mod transformer;
mod trie;

#[cfg(test)]
mod tests {
  use crate::str_to_u16_slice;
  use crate::transformer::transformer::{
    transform_inline_style_string, transform_parsed_style_string,
  };

  use super::*;
  #[test]
  fn transform_basic() {
    let source = str_to_u16_slice!("height:1px;display:linear;flex-direction:row;width:100px;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "height:1px;--lynx-display-toggle:var(--lynx-display-linear);--lynx-display:linear;display:flex;--flex-direction:row;width:100px;"
    );
  }

  #[test]
  fn transform_with_blank() {
    let source = str_to_u16_slice!("flex-direction:row;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(String::from_utf16_lossy(&result), "--flex-direction:row;");
  }

  #[test]
  fn test_replace_rule_display_linear_blank_after_colon() {
    let source = str_to_u16_slice!("display: linear;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--lynx-display-toggle:var(--lynx-display-linear);--lynx-display:linear;display:flex;"
    );
  }

  #[test]
  fn test_replace_rule_display_linear_important() {
    let source = str_to_u16_slice!("display: linear !important;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--lynx-display-toggle:var(--lynx-display-linear) !important;--lynx-display:linear !important;display:flex !important;"
    );
  }

  #[test]
  fn transform_color_normal() {
    let source = str_to_u16_slice!("color:blue;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--lynx-text-bg-color:initial;-webkit-background-clip:initial;background-clip:initial;color:blue;"
    );
  }

  #[test]
  fn transform_color_normal_with_blank() {
    let source = str_to_u16_slice!(" color : blue ;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      " --lynx-text-bg-color:initial;-webkit-background-clip:initial;background-clip:initial;color:blue ;"
    );
  }

  #[test]
  fn transform_color_normal_important() {
    let source = str_to_u16_slice!(" color : blue !important ;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      " --lynx-text-bg-color:initial !important;-webkit-background-clip:initial !important;background-clip:initial !important;color:blue !important ;"
    );
  }

  #[test]
  fn transform_color_linear_gradient() {
    let source = str_to_u16_slice!(" color : linear-gradient(pink, blue) ;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      " color:transparent;-webkit-background-clip:text;background-clip:text;--lynx-text-bg-color:linear-gradient(pink, blue) ;"
    );
  }

  #[test]
  fn transform_color_linear_gradient_important() {
    let source = str_to_u16_slice!(" color : linear-gradient(pink, blue) !important ;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      " color:transparent !important;-webkit-background-clip:text !important;background-clip:text !important;--lynx-text-bg-color:linear-gradient(pink, blue) !important ;"
    );
  }

  #[test]
  fn transform_color_with_font_size() {
    let source = str_to_u16_slice!("font-size: 24px; color: blue");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "font-size: 24px; --lynx-text-bg-color:initial;-webkit-background-clip:initial;background-clip:initial;color:blue"
    );
  }

  #[test]
  fn flex_none() {
    let source = str_to_u16_slice!("flex:none;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-shrink:0;--flex-grow:0;--flex-basis:auto;"
    );
  }

  #[test]
  fn flex_auto() {
    let source = str_to_u16_slice!("flex:auto;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-shrink:1;--flex-grow:1;--flex-basis:auto;"
    );
  }

  #[test]
  fn flex_1() {
    let source = str_to_u16_slice!("flex:1;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-shrink:1;--flex-basis:0%;--flex-grow:1;"
    );
  }
  #[test]
  fn flex_1_percent() {
    let source = str_to_u16_slice!("flex:1%;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-shrink:1;--flex-grow:1;--flex-basis:1%;"
    );
  }

  #[test]
  fn flex_2_3() {
    let source = str_to_u16_slice!("flex:2 3;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-grow:2;--flex-basis:0%;--flex-shrink:3;"
    );
  }

  #[test]
  fn flex_2_3_percentage() {
    let source = str_to_u16_slice!("flex:2 3%;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-grow:2;--flex-shrink:1;--flex-basis:3%;"
    );
  }

  #[test]
  fn flex_2_3_px() {
    let source = str_to_u16_slice!("flex:2 3px;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-grow:2;--flex-shrink:1;--flex-basis:3px;"
    );
  }

  #[test]
  fn flex_3_4_5_percentage() {
    let source = str_to_u16_slice!("flex:3 4 5%;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-grow:3;--flex-shrink:4;--flex-basis:5%;"
    );
  }

  #[test]
  fn flex_1_extra() {
    let source = str_to_u16_slice!("width:100px; flex:none; width:100px;");
    let result = transform_inline_style_string(source).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "width:100px; --flex-shrink:0;--flex-grow:0;--flex-basis:auto; width:100px;"
    );
  }

  #[test]
  fn linear_weight_sum_0_children_style() {
    let source = str_to_u16_slice!("linear-weight-sum: 0;");
    let result = transform_inline_style_string(source).1;
    assert_eq!(String::from_utf16_lossy(&result), "--linear-weight-sum:1;");
  }

  #[test]
  fn linear_weight_sum_1_children_style() {
    let source = str_to_u16_slice!("linear-weight-sum: 1;");
    let result = transform_inline_style_string(source).1;
    assert_eq!(String::from_utf16_lossy(&result), "--linear-weight-sum:1;");
  }

  #[test]
  fn linear_weight_sum_1_important_children_style() {
    let source = str_to_u16_slice!("linear-weight-sum: 1 !important;");
    let result = transform_inline_style_string(source).1;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--linear-weight-sum:1 !important;"
    );
  }

  #[test]
  fn transform_parsed_style_string_work() {
    let source = str_to_u16_slice!("flex:1;");
    let result = transform_parsed_style_string(source, &[0, 4, 5, 6, 0]).0;
    assert_eq!(
      String::from_utf16_lossy(&result),
      "--flex-shrink:1;--flex-basis:0%;--flex-grow:1;"
    );
  }
}
