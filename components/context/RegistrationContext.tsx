"use client"

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

     
        if (!formData.first_name?.trim()) newErrors.first_name = "First name is required";
        if (!formData.last_name?.trim()) newErrors.last_name = "Last name is required";
        
        if (!formData.email?.trim()) {
            newErrors.email = "Email is required";
        } else if (!emailRe.test(formData.email)) {
            newErrors.email = "Invalid email format";
        }
        
        if (!formData.phone?.trim()) newErrors.phone = "Phone number is required";
        
        if (formData.age === "" || formData.age === undefined) {
            newErrors.age = "Age is required";
        
        } else if (isNaN(Number(formData.age))) {
            newErrors.age = "Invalid age";
        
        }
        
        if (!formData.sex) newErrors.sex = "Sex is required";
        
        if (!formData.password) {
            newErrors.password = "Password is required";
        } else if (
            formData.password.length < 8 ||
            !/[A-Z]/.test(formData.password) ||
            !/[a-z]/.test(formData.password) ||
            !/[0-9]/.test(formData.password) ||
            !/[^A-Za-z0-9]/.test(formData.password)
        ) {
            newErrors.password = "Password doesn't meet the requirements above";
        }
        if (!formData.confirmPassword) {
            newErrors.confirmPassword = "Password confirmation is required";
        } else if (formData.confirmPassword !== formData.password) {
            newErrors.confirmPassword = "Password Mismatch";
        }

   
        if (!formData.current_address?.trim()) newErrors.current_address = "Current address is required";
        if (formData.has_permanent_address === false && !formData.reason?.trim()) {
            newErrors.reason = "Reason for no permanent address is required";
        }

        if (formData.has_history === true && !formData.medical_description?.trim()) {
            newErrors.medical_description = "Medical description is required";
        }
        if (!formData.emergency_person?.trim()) newErrors.emergency_person = "Emergency contact name is required";
        if (!formData.emergency_contact_number?.trim()) newErrors.emergency_contact_number = "Emergency contact number is required";

        if (!formData.terms) newErrors.terms = "Please Accept the Terms and Conditions";

        setErrors(newErrors);

        if (step === 1) {
            return !newErrors.first_name && !newErrors.last_name && !newErrors.email && 
                   !newErrors.phone && !newErrors.age && !newErrors.sex && 
                   !newErrors.password && !newErrors.confirmPassword;
        }
        if (step === 2) {
            return !newErrors.current_address && !newErrors.reason;
        }
        if (step === 3) {
            return !newErrors.medical_description && !newErrors.emergency_person && !newErrors.emergency_contact_number;
        }
        if (step === 4) {
            return Object.keys(newErrors).length === 0;
        }

        return Object.keys(newErrors).length === 0;
    }

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