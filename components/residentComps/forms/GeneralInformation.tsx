 import Link from "next/link";
 
 export default function GeneralInformation() {
    return (    
        <>
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
        </>
    )
 } 
