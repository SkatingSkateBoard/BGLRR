type Sex = "MALE" | "FEMALE" | "";

type GeneralInfo = {
  //General Info 
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  phone: string;
  age: number | "";
  sex: Sex;
}

type AddressInfo = {
  has_permanent_address: boolean,
  proof_of_accomodation: File | "",
  current_address: string; 
  reason: string;
}

type MedicalInfo = {
  has_history: boolean, 
  medical_description: string,
  emergency_person: string,
  emergency_contact_number: string,
}


export type UserFormValues = GeneralInfo & AddressInfo & MedicalInfo & { terms: boolean };;

export const initialFormValues: UserFormValues = {
  // General Info
  email: "",
  password: "",
  confirmPassword: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  phone: "",
  age: "",
  sex: "",

  // Address Info
  has_permanent_address: false,
  proof_of_accomodation: "",
  current_address: "",
  reason: "",

  // Medical Info
  has_history: false,
  medical_description: "",
  emergency_person: "",
  emergency_contact_number: "",

  //TOS
  terms: false,
};