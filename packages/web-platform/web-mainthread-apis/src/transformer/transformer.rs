use crate::transformer::constants::{
  AUTO_STR_U16, COLOR_APPENDIX_FOR_GRADIENT, COLOR_APPENDIX_FOR_NORMAL_COLOR, COLOR_STR_U16,
  FLEX_AUTO_TRANSFORMED_VALIES, FLEX_BASIS_CSS_VAR_NAME, FLEX_GROW_CSS_VAR_NAME,
  FLEX_NONE_TRANSFORMED_VALIES, FLEX_SHRINK_CSS_VAR_NAME,
  FLEX_SINGLE_VALUE_USE_BASIS_TRANSFORMED_DEFAULT_VALUES,
  FLEX_SINGLE_VALUE_USE_GROW_TRANSFORMED_DEFAULT_VALUES, FLEX_STR_U16, IMPORTANT_STR_U16,
  LINEAR_GRADIENT_STR_U16, LINEAR_WEIGHT_SUM_CSS_VAR_NAME, LINEAR_WEIGHT_SUM_STR_U16,
  LYNX_TEXT_BG_COLOR_STR_U16, NONE_STR_U16,
};
use crate::{
  get_rename_rule_value, get_replace_rule_value,
  parser::{self, parse_inline_style::Transformer},
};
use crate::{is_newline, is_white_space, str_to_u16_slice};

pub struct TransformerData<'a> {
  source: &'a [u16],
  transformed_source: Vec<u16>,
  offset: usize,                   // current the tail offset of the original source
  extra_children_styles: Vec<u16>, // used to store the extra styles for children elements
}

// append ';' at the end of each declaration except the last one
macro_rules! append_separator {
  ($transformed_source:expr, $decl_index:expr, $total_len:expr, $is_important:expr) => {
    if $decl_index < $total_len - 1 {
      if $is_important {
        $transformed_source.extend_from_slice(IMPORTANT_STR_U16);
      }
      $transformed_source.push(b';' as u16);
    }
  };
}

macro_rules! is_digit_only {
  ($source:expr, $start:expr, $end:expr) => {{
    let mut result = true;
    for code in $source[$start..$end].iter() {
      if *code > b'9' as u16 || *code < b'0' as u16 {
        result = false;
        break;
      }
    }
    result
  }};
}

macro_rules! push_u16_decl_pairs {
  ($vec:expr, $pairs:expr) => {
    $vec.extend($pairs.iter().map(|replaced| {
      let decl_name = replaced[0];
      let decl_value = replaced[1];
      (
        decl_name,
        0,
        decl_name.len(),
        decl_value,
        0,
        decl_value.len(),
      )
    }));
  };
}

pub fn query_transform_rules<'a>(
  name: &'a [u16],
  name_start: usize,
  name_end: usize,
  value: &'a [u16],
  value_start: usize,
  value_end: usize,
) -> (
  Vec<(&'a [u16], usize, usize, &'a [u16], usize, usize)>,
  Vec<(&'a [u16], usize, usize, &'a [u16], usize, usize)>,
) {
  let mut result: Vec<(&'a [u16], usize, usize, &'a [u16], usize, usize)> = Vec::new();
  let mut result_children: Vec<(&'a [u16], usize, usize, &'a [u16], usize, usize)> = Vec::new();
  if let Some(renamed_value) = get_rename_rule_value!(name, name_start, name_end) {
    let renamed_value = renamed_value[0][0];
    result.push((
      renamed_value,
      0,
      renamed_value.len(),
      value,
      value_start,
      value_end,
    ));
  } else if let Some(replaced) =
    get_replace_rule_value!(name, name_start, name_end, value, value_start, value_end)
  {
    push_u16_decl_pairs!(result, replaced);
  }
  // now transform color
  /*
    if there is a color:linear-gradient(xx) declaration,
      we will transform it to:
      color: transparent;
      --lynx-text-bg-color: linear-gradient(xx);
      -webkit-background-clip: text;
      background-clip: text;
    otherwise:
      --lynx-text-bg-color: initial;
      -webkit-background-clip: initial;
      background-clip: initial;
      color: xx;
  */
  // compare the name is "color"
  else if name[name_start..name_end] == *COLOR_STR_U16 {
    // check if the value is starting with "linear-gradient"
    let is_linear_gradient = value_end - value_start >= LINEAR_GRADIENT_STR_U16.len()
      && value[value_start..value_start + LINEAR_GRADIENT_STR_U16.len()]
        == *LINEAR_GRADIENT_STR_U16;
    let (appendix, keeped_name) = if is_linear_gradient {
      (COLOR_APPENDIX_FOR_GRADIENT, LYNX_TEXT_BG_COLOR_STR_U16)
    } else {
      (COLOR_APPENDIX_FOR_NORMAL_COLOR, COLOR_STR_U16)
    };
    push_u16_decl_pairs!(result, appendix);
    result.push((
      keeped_name,
      0,
      keeped_name.len(),
      value,
      value_start,
      value_end,
    ));
  }
  /* transform the flex 1 2 3 to
  --flex-shrink:1;
  --flex-grow:2;
  --flex-basis:3;
  */
  else if name[name_start..name_end] == *FLEX_STR_U16 {
    // we will use the value as flex-basis, flex-grow, flex-shrink
    let mut offset = value_start;
    let mut val_fields = [value_end; 6]; // we will use 3 fields, but we will use 6 to avoid the need to check the length
    let mut ii = 0;
    while offset < value_end && ii < val_fields.len() {
      let code = value[offset];
      if (ii % 2 == 0 && !is_white_space!(code)) || (ii % 2 == 1 && is_white_space!(code)) {
        val_fields[ii] = offset;
        ii += 1;
      }
      offset += 1;
    }
    let value_num: usize = (ii + 1) / 2; // we will have 3 values, but the last one is optional
    match value_num {
      0 => {
        // if we have no value, we will ignore it
        // we will not add any declaration
      }
      1 => {
        if value[val_fields[0]..val_fields[1]] == *NONE_STR_U16 {
          /*
           * --flex-shrink:0;
           * --flex-grow:0;
           * --flex-basis:auto;
           */
          push_u16_decl_pairs!(result, FLEX_NONE_TRANSFORMED_VALIES);
        } else if value[val_fields[0]..val_fields[1]] == *AUTO_STR_U16 {
          /*
           * --flex-shrink:1;
           * --flex-grow:1;
           * --flex-basis:auto;
           */
          push_u16_decl_pairs!(result, FLEX_AUTO_TRANSFORMED_VALIES);
        } else {
          let is_flex_grow = is_digit_only!(value, val_fields[0], val_fields[1]);
          if is_flex_grow {
            // if we only have one pure number, we will use it as flex-grow
            // flex: <flex-grow> 1 0
            push_u16_decl_pairs!(
              result,
              FLEX_SINGLE_VALUE_USE_GROW_TRANSFORMED_DEFAULT_VALUES
            );
            result.push((
              FLEX_GROW_CSS_VAR_NAME,
              0,
              FLEX_GROW_CSS_VAR_NAME.len(),
              value,
              val_fields[0],
              val_fields[1],
            ));
          } else {
            // else it is
            // flex: 1 1 <flex-basis>
            push_u16_decl_pairs!(
              result,
              FLEX_SINGLE_VALUE_USE_BASIS_TRANSFORMED_DEFAULT_VALUES
            );
            result.push((
              FLEX_BASIS_CSS_VAR_NAME,
              0,
              FLEX_BASIS_CSS_VAR_NAME.len(),
              value,
              val_fields[0],
              val_fields[1],
            ));
          }
        }
      }
      2 => {
        // The first value must be a valid value for flex-grow.
        result.push((
          FLEX_GROW_CSS_VAR_NAME,
          0,
          FLEX_GROW_CSS_VAR_NAME.len(),
          value,
          val_fields[0],
          val_fields[1],
        ));
        let is_flex_shrink = is_digit_only!(value, val_fields[2], val_fields[3]);
        if is_flex_shrink {
          /*
          a valid value for flex-shrink: then, in all the browsers,
          the shorthand expands to flex: <flex-grow> <flex-shrink> 0%.
           */
          result.push((
            FLEX_BASIS_CSS_VAR_NAME,
            0,
            FLEX_BASIS_CSS_VAR_NAME.len(),
            str_to_u16_slice!("0%"),
            0,
            str_to_u16_slice!("0%").len(),
          ));
          result.push((
            FLEX_SHRINK_CSS_VAR_NAME,
            0,
            FLEX_SHRINK_CSS_VAR_NAME.len(),
            value,
            val_fields[2],
            val_fields[3],
          ));
        } else {
          /*
          a valid value for flex-basis: then the shorthand expands to flex: <flex-grow> 1 <flex-basis>.
           */

          result.push((
            FLEX_SHRINK_CSS_VAR_NAME,
            0,
            FLEX_SHRINK_CSS_VAR_NAME.len(),
            str_to_u16_slice!("1"),
            0,
            1,
          ));
          result.push((
            FLEX_BASIS_CSS_VAR_NAME,
            0,
            FLEX_BASIS_CSS_VAR_NAME.len(),
            value,
            val_fields[2],
            val_fields[3],
          ));
        }
      }
      3 => {
        // flex: <flex-grow> <flex-shrink> <flex-basis>
        let transformed_flex_values = &[
          &[FLEX_GROW_CSS_VAR_NAME, &value[val_fields[0]..val_fields[1]]],
          &[
            FLEX_SHRINK_CSS_VAR_NAME,
            &value[val_fields[2]..val_fields[3]],
          ],
          &[
            FLEX_BASIS_CSS_VAR_NAME,
            &value[val_fields[4]..val_fields[5]],
          ],
        ];
        push_u16_decl_pairs!(result, transformed_flex_values);
      }
      _ => {
        // we have more than 3 values, we will ignore the rest
      }
    }
  }
  /*
   now we're going to generate children style for linear-weight-sum
   linear-weight-sum: 0; --> --linear-weight-sum: 1;
   linear-weight-sum: <value> --> --linear-weight-sum: <value>;
  */
  if name[name_start..name_end] == *LINEAR_WEIGHT_SUM_STR_U16 {
    if value_end - value_start == 1 && value[value_start] == b'0' as u16 {
      // if the value is 0, we will use 1
      result_children.push((
        LINEAR_WEIGHT_SUM_CSS_VAR_NAME,
        0,
        LINEAR_WEIGHT_SUM_CSS_VAR_NAME.len(),
        str_to_u16_slice!("1"),
        0,
        1,
      ));
    } else {
      result_children.push((
        LINEAR_WEIGHT_SUM_CSS_VAR_NAME,
        0,
        LINEAR_WEIGHT_SUM_CSS_VAR_NAME.len(),
        value,
        value_start,
        value_end,
      ));
    }
  }
  (result, result_children)
}

impl<'a> Transformer for TransformerData<'a> {
  fn on_declaration(
    &mut self,
    name_start: usize,
    name_end: usize,
    value_start: usize,
    value_end: usize,
    is_important: bool,
  ) {
    let (result, result_children) = query_transform_rules(
      &self.source,
      name_start,
      name_end,
      &self.source,
      value_start,
      value_end,
    );

    if !result.is_empty() {
      // Append content before the declaration name
      self
        .transformed_source
        .extend_from_slice(&self.source[self.offset..name_start]);

      let result_len = result.len();
      for (
        idx,
        (decl_name, decl_name_start, decl_name_end, decl_value, decl_value_start, decl_value_end),
      ) in result.iter().enumerate()
      {
        // Append the declaration name and colon
        self
          .transformed_source
          .extend_from_slice(&decl_name[*decl_name_start..*decl_name_end]);
        self.transformed_source.push(b':' as u16);
        // Append the declaration value
        self
          .transformed_source
          .extend_from_slice(&decl_value[*decl_value_start..*decl_value_end]);
        // Append separator
        append_separator!(self.transformed_source, idx, result_len, is_important);
      }
      self.offset = value_end;
    }

    if !result_children.is_empty() {
      let result_len = result_children.len();
      for (
        idx,
        (decl_name, decl_name_start, decl_name_end, decl_value, decl_value_start, decl_value_end),
      ) in result_children.iter().enumerate()
      {
        // Append the declaration name and colon
        self
          .extra_children_styles
          .extend_from_slice(&decl_name[*decl_name_start..*decl_name_end]);
        self.extra_children_styles.push(b':' as u16);
        // Append the declaration value
        self
          .extra_children_styles
          .extend_from_slice(&decl_value[*decl_value_start..*decl_value_end]);
        // Append separator
        append_separator!(
          self.extra_children_styles,
          idx,
          result_len + 1, // always add !important; at the end for children styles
          is_important
        );
      }
    }
  }
}

pub fn transform_inline_style_string<'a>(source: &'a [u16]) -> (Vec<u16>, Vec<u16>) {
  let mut transformer: TransformerData<'a> = TransformerData {
    source,
    transformed_source: Vec::new(),
    offset: 0,
    extra_children_styles: Vec::new(),
  };
  parser::parse_inline_style::parse_inline_style(source, &mut transformer);
  if transformer.offset != 0 {
    // append the remaining part of the source
    transformer
      .transformed_source
      .extend_from_slice(&source[transformer.offset..]);
  }
  (
    transformer.transformed_source,
    transformer.extra_children_styles,
  )
}

pub fn transform_parsed_style_string<'a>(
  source: &'a [u16],
  declaration_positions: &[usize],
) -> (Vec<u16>, Vec<u16>) {
  assert!(declaration_positions.len() % 5 == 0, "declaration_positions must be a multiple of 5 for name_start, name_end, value_start, value_end, is_important");
  let mut transformer: TransformerData<'a> = TransformerData {
    source,
    transformed_source: Vec::new(),
    offset: 0,
    extra_children_styles: Vec::new(),
  };
  let mut ii = 0;
  while ii + 4 < declaration_positions.len() {
    let name_start = declaration_positions[ii];
    let name_end = declaration_positions[ii + 1];
    let value_start = declaration_positions[ii + 2];
    let value_end = declaration_positions[ii + 3];
    let is_important = declaration_positions[ii + 4] != 0;
    transformer.on_declaration(name_start, name_end, value_start, value_end, is_important);
    ii += 5;
  }
  if transformer.offset != 0 {
    // append the remaining part of the source
    transformer
      .transformed_source
      .extend_from_slice(&source[transformer.offset..]);
  }
  (
    transformer.transformed_source,
    transformer.extra_children_styles,
  )
}
