import * as yup from 'yup';
import { VALIDATION_MSGS } from './constants';

export const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email(VALIDATION_MSGS.email)
    .required(VALIDATION_MSGS.required),
  // Login validation must be permissive so failed attempts still reach backend monitoring.
  password: yup
    .string()
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

export const registerSchema = yup.object({
  name: yup
    .string()
    .required("Full name is required"),

  email: yup
    .string()
    .email("Invalid email")
    .required("Email is required"),

  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),

  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
});


