// Context for registration form
import React, { createContext, useContext, useState, ReactNode } from "react";
import { UserFormValues, initialFormValues } from "@/types/index";

type FormContextProps = {
    formData: UserFormValues;
    errors: Record<string, string>;
    updateForm: (fields: Partial<UserFormValues>) => void;
    validateStep: (step: number) => boolean;
    clearErrors: () => void;
} 

const FormContext = createContext<FormContextProps | undefined>(undefined);

export const FormProvider = ({ children }: { children: ReactNode }) => {
    const [formData, setFormData] = useState<UserFormValues>({
        ...initialFormValues,
        terms: false
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateForm = (fields: Partial<UserFormValues>) => {
        setFormData((prev) => ({ ...prev, ...fields }));

        const fieldKeys = Object.keys(fields);
        if (fieldKeys.length > 0) {
            setErrors((prev) => {
                const next = { ...prev };
                fieldKeys.forEach((key) => delete next[key]);
                return next;
            });
        }
    };

    const clearErrors = () => setErrors({});

    const validateStep = (step: number) => {
        const newErrors: Record<string, string> = {};
        const emailRe = /^\S+@\S+\.\S+$/;

        switch (step) {
            case 1:
                // General Information Validations
                if (!formData.first_name.trim()) newErrors.first_name = "required";
                if (!formData.last_name.trim()) newErrors.last_name = "required";
                
                if (!formData.email.trim()) {
                    newErrors.email = "required";
                } else if (!emailRe.test(formData.email)) {
                    newErrors.email = "invalid";
                }

                if (!formData.phone.trim()) newErrors.phone = "required";

                if (formData.age === "") {
                    newErrors.age = "required";
                } else if (isNaN(Number(formData.age))) {
                    newErrors.age = "invalid";
                } 

                if (!formData.sex) newErrors.sex = "required";

                if (!formData.password) {
                    newErrors.password = "Password is required.";
                } else if (
                    formData.password.length < 8 ||
                    !/[A-Z]/.test(formData.password) ||
                    !/[a-z]/.test(formData.password) ||
                    !/[0-9]/.test(formData.password) ||
                    !/[^A-Za-z0-9]/.test(formData.password)
                ) {
                    newErrors.password = "Password doesn't meet the requirements below.";
                }

                if (!formData.confirmPassword) {
                    newErrors.confirmPassword = "required";
                } else if (formData.confirmPassword !== formData.password) {
                    newErrors.confirmPassword = "mismatch";
                }
                break;

            case 2:
                // Occupancy Validations
                if (formData.has_permanent_address === undefined) {
                    newErrors.has_permanent_address = "required";
                }

                if (formData.has_permanent_address === true) {
                    if (!formData.current_address.trim()) newErrors.current_address = "required";
                }

                if (formData.has_permanent_address === false) {
                    if (!formData.reason.trim()) newErrors.reason = "required";
                    if (!formData.current_address.trim()) newErrors.current_address = "required";
                }
                break;

            case 3:
                // Medical Information Validations
                if (formData.has_history === true && !formData.medical_description.trim()) {
                    newErrors.medical_description = "required";
                }
                if (!formData.emergency_person.trim()) newErrors.emergency_person = "required";
                if (!formData.emergency_contact_number.trim()) newErrors.emergency_contact_number = "required";
                break;

            case 4:
                // Terms & Conditions Checkbox Validation
                if (!formData.terms) newErrors.terms = "required";
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    return (
        <FormContext.Provider value={{ formData, errors, updateForm, clearErrors, validateStep }}>
            {children}
        </FormContext.Provider>
    );
};

export const useRegistrationForm = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error("useRegistrationForm must be used within a FormProvider");
  return context;
};