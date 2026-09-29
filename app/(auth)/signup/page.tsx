"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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

type UserFormValues = GeneralInfo & AddressInfo & MedicalInfo;

const initialFormValues: UserFormValues = {
  // General 
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

  // Address 
  has_permanent_address: false,
  proof_of_accomodation: "",
  current_address: "",
  reason: "",

  // Medical 
  has_history: false,
  medical_description: "",
  emergency_person: "",
  emergency_contact_number: "",
};

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  //FORM DATA FOR AUTH.USER
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  //Form data for tbl_resident
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [sex, setSex] = useState<Sex | "">("");
  

  //Logic Handlers
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setMessage("");

    //error handlers 
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (age === "") {
      setError("Please enter your age.");
      return;
    }

    if (sex === "") {
      setError("Please select your sex.");
      return;
    }

    setLoading(true);
    // Attempts to sign up user with Supabase
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: "resident",

          //resident data 
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          suffix: suffix,
          phone: phone,
          age: age,
          gender: sex, 

        }
      }
    });

    if (error) {
      setError(error.message);
        console.log('Supabase error:', error);
  console.log('Message:', error.message);
  console.log('Code:', error.code);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.user && !data.session) {
      sessionStorage.setItem("signupEmail", email);
      sessionStorage.setItem("otpSource", "signup");
      router.push("/otp");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="signup-page">
      <h1>Register</h1>
        <form onSubmit={handleSubmit}>
          <fieldset>
            <legend>General Information</legend>
              
              <div className="form-row">
                <label htmlFor="first-name">First Name</label>
                <input type="text" id="first-name" name="first_name" required value={firstName || ""} onChange={(e) => setFirstName(e.target.value)}/>
              </div>

              <div className="form-row">
                <label htmlFor="middle-name">Middle Name</label>
                <input type="text" id="middle-name" name="middle_name" value={middleName || ""} onChange={(e) => setMiddleName(e.target.value)}/>
              </div>

              <div className="form-row">
                <label htmlFor="last-name">Last Name</label>
                <input type="text" id="last-name" name="last_name" required value={lastName || ""} onChange={(e) => setLastName(e.target.value)}/>
              </div>

              <div className="form-row">
                 <label htmlFor="suffix">Suffix</label>
                    <select id="suffix" name="suffix" value={suffix || ""} onChange={(e) => setSuffix(e.target.value)}>
                      <option value="">Select a suffix</option>
                      <option value="Jr.">Jr.</option>
                      <option value="Sr.">Sr.</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
                      <option value="IV">IV</option>
                      <option value="V">V</option>
                    </select>
              </div>

              <div className="form-row">
                <label htmlFor="email">Email Address</label>
                <input type="email" id="email" name="email" autoComplete="email" required value={email || ""} onChange={(e) => setEmail(e.target.value)}/>
              </div>

              <div className="form-row">
                <label htmlFor="phone">Phone Number</label>
                <input type="tel" id="phone" name="phone" autoComplete="tel" value={phone || ""} onChange={(e) => setPhone(e.target.value)}/>
              </div>

              <div className="form-row">
                <label htmlFor="age">Age</label>
                <input type="number" id="age" name="age" autoComplete="age" required value={age} onChange={(e) =>  {const value = e.target.value; setAge(value === "" ? "" : Number(value))}}/>
              </div>

              <div className="form-row">
                 <label htmlFor="sex">Sex</label>
                  <select id="sex" name="sex" required value={sex || ""} onChange={(e) => setSex(e.target.value as Sex)}>
                    <option value="">Select sex</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
              </div>

              <div className="form-row">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="password" autoComplete="current-password" required value={password || ""} onChange={(e) => setPassword(e.target.value)}/>
              </div>

              <div className="form-row">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input type="password" id="confirm-password" name="confirm_password" autoComplete="current-password" required value={confirmPassword || ""} onChange={(e) => setConfirmPassword(e.target.value)}/>
              </div>

              <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200">
                {loading ? "Creating account..." : "Create Account"}
              </button>

              {error && <p className="error">{error}</p>}
              {message && <p className="message">{message}</p>}
          </fieldset>
        </form>
        

        <h1>Already have an account?</h1>
        <Link href="/resident/login" className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition duration-200">
          Sign in
        </Link>
    </main> 
  );
}
