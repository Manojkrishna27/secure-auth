import * as yup from 'yup';
import { VALIDATION_MSGS } from './constants';

export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email(VALIDATION_MSGS.email)
    .required(VALIDATION_MSGS.required),
  password: yup
    .string()
    .min(8, VALIDATION_MSGS.passwordMin)
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      VALIDATION_MSGS.passwordStrength
    )
    .required(VALIDATION_MSGS.required)
});

export const forgotSchema = yup.object().shape({
  email: yup
    .string()
    .email(VALIDATION_MSGS.email)
    .required(VALIDATION_MSGS.required)
});

export const otpSchema = yup.object().shape({
  otp: yup
    .string()
    .length(6, VALIDATION_MSGS.otp)
    .required(VALIDATION_MSGS.required)
});

export const resetSchema = yup.object().shape({
  password: yup
    .string()
    .min(8, VALIDATION_MSGS.passwordMin)
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      VALIDATION_MSGS.passwordStrength
    )
    .required(VALIDATION_MSGS.required),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password'), null], VALIDATION_MSGS.confirmPass)
    .required(VALIDATION_MSGS.required)
});

