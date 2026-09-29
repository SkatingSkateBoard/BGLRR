//Context for registration form

import React, { createContext, useContext, useState, ReactNode } from "react";
import { UserFormValues, initialFormValues } from "@/types/index";

//props to pass
type FormContextProps = {
    formData: UserFormValues,
    errors: Record<string, string>
    updateForm: (fields: Partial<UserFormValues>) => void;
    validateStep: (step: number) => boolean;
    clearErrors: () => void;
} 

const FormContext = createContext<FormContextProps | undefined>(undefined);

export const FormProvider = ({children}: {children: ReactNode}) => {
    const [formData, setFormData] = useState<UserFormValues>(initialFormValues);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const updateForm = (fields: Partial<UserFormValues>) => {
        setFormData((prev) => ({...prev, ...fields}));

        const fieldKeys = Object.keys(fields);
        if (fieldKeys.length > 0) {
            setErrors((prev) => {
                const next = {...prev}
                fieldKeys.forEach((key) => delete next[key]);
                return next;
            });
        }
    };

    const clearErrors = () => setErrors({});
    //client validations
    const validateStep = (step: number) => {
        const newErrors: Record<string, string> = {};

        switch (step) {
            case 1:
                if (!formData.email.includes("@")) newErrors.email = "Invalid email address";
                if (!formData.password) newErrors.password = "Password is required";
                if (formData.password.length < 8) newErrors.password = "Password must not be less than 8";
                if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
                if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
                if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
                if (formData.age === "" || formData.age < 18) newErrors.age = "You must be 18 or older";
                if (!formData.sex) newErrors.sex = "Please select your sex";
                break;
            case 2:
                if (!formData.current_address.trim()) newErrors.current_address = "Current address is required";
                if (!formData.has_permanent_address && !formData.reason.trim()) newErrors.reason = "Please state your reason for temporary accommodation";
                break;
                //todo proof of accom
            case 3:
                if (formData.has_history && !formData.medical_description.trim()) {
                    newErrors.medical_description = "Please briefly explain your medical history";
                }
                if (!formData.emergency_person.trim()) {
                    newErrors.emergency_person = "An Emergency contact person is required";
                }
                if (!formData.emergency_contact_number.trim()) {
                    newErrors.emergency_contact_number = "An Emergency contact number is required";
                }
                break;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }
    
    return (
        <FormContext.Provider value={{formData, errors, updateForm, clearErrors, validateStep}}>
            {children}
        </FormContext.Provider>
    )
}
//custom context hook
export const useRegistrationForm = () => {
  const context = useContext(FormContext);
  if (!context) throw new Error("useRegistrationForm must be used within a FormProvider");
  return context;
};
