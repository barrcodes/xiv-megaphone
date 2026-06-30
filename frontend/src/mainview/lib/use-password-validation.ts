import { useMemo } from "react";

const SYMBOL_PATTERN = /[!@#$%^&*()_+\-=\[\]{};'"|<>?,.\/`~]/;

export interface PasswordValidation {
	minLength: boolean;
	hasUpper: boolean;
	hasLower: boolean;
	hasNumber: boolean;
	hasSymbol: boolean;
	isValid: boolean;
}

export function usePasswordValidation(password: string): PasswordValidation {
	return useMemo(() => {
		const minLength = password.length >= 8;
		const hasUpper = /[A-Z]/.test(password);
		const hasLower = /[a-z]/.test(password);
		const hasNumber = /[0-9]/.test(password);
		const hasSymbol = SYMBOL_PATTERN.test(password);
		return {
			minLength,
			hasUpper,
			hasLower,
			hasNumber,
			hasSymbol,
			isValid: minLength && hasUpper && hasLower && hasNumber && hasSymbol,
		};
	}, [password]);
}
