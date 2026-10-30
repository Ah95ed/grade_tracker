import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';

/// Responsive spacing and layout helper extensions
extension ResponsiveSpacingExtension on num {
  /// Vertical responsive SizedBox
  Widget get verticalSpace => SizedBox(height: h);

  /// Horizontal responsive SizedBox
  Widget get horizontalSpace => SizedBox(width: w);

  /// Responsive EdgeInsets for all sides
  EdgeInsets get allPadding => EdgeInsets.all(r);

  /// Responsive horizontal EdgeInsets
  EdgeInsets get horizontalPadding => EdgeInsets.symmetric(horizontal: w);

  /// Responsive vertical EdgeInsets
  EdgeInsets get verticalPadding => EdgeInsets.symmetric(vertical: h);

  /// Responsive radius
  Radius get circularRadius => Radius.circular(r);

  /// Responsive BorderRadius
  BorderRadius get circularBorderRadius => BorderRadius.circular(r);
}

