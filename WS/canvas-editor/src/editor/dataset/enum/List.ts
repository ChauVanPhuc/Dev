export enum ListType {
  UL = 'ul',
  OL = 'ol'
}

export enum UlStyle {
  DISC = 'disc', // 实心圆点
  CIRCLE = 'circle', // 空心圆点
  SQUARE = 'square', // 实心方块
  CHECKBOX = 'checkbox' // 复选框
}

export enum OlStyle {
  DECIMAL = 'decimal', // 1., 2., 3.
  DECIMAL_PAREN = 'decimal-paren', // 1), 2), 3)
  LOWER_ALPHA = 'lower-alpha', // a., b., c.
  LOWER_ALPHA_PAREN = 'lower-alpha-paren', // a), b), c)
  UPPER_ALPHA = 'upper-alpha', // A., B., C.
  LOWER_ROMAN = 'lower-roman', // i., ii., iii.
  UPPER_ROMAN = 'upper-roman' // I., II., III.
}

export enum ListStyle {
  DISC = UlStyle.DISC,
  CIRCLE = UlStyle.CIRCLE,
  SQUARE = UlStyle.SQUARE,
  DECIMAL = OlStyle.DECIMAL,
  DECIMAL_PAREN = OlStyle.DECIMAL_PAREN,
  LOWER_ALPHA = OlStyle.LOWER_ALPHA,
  LOWER_ALPHA_PAREN = OlStyle.LOWER_ALPHA_PAREN,
  UPPER_ALPHA = OlStyle.UPPER_ALPHA,
  LOWER_ROMAN = OlStyle.LOWER_ROMAN,
  UPPER_ROMAN = OlStyle.UPPER_ROMAN,
  CHECKBOX = UlStyle.CHECKBOX
}
