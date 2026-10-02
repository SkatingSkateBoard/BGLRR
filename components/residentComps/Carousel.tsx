"use client"

import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { InputField } from "@/components/ui/InputField"
import { DropdownField } from "@/components/ui/Dropdown"
import { CircleQuestionMark } from "lucide-react"
import { Checkbox } from "@/components/ui/Checkbox"
import { ScrollableBox } from "@/components/ui/ScrollableBox"
import { ErrorBox } from "@/components/ui/ErrorInfo"
import { useRegistrationForm } from "@/components/context/RegistrationContext"

import {useRouter} from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const inputClass =
  "text-[12px] h-13 border-1 min-w-0 pl-3 border-gray-150 rounded-[2vw] md:rounded-md focus:outline-hidden"
const pClass = "font-bold text-[22px] mb-5 mt-4"
const buttonClass = "w-full h-15 bg-[rgb(32,32,162)]"

function InnerCarousel({ index, register, children }: {
  index: number
  register: (index: number, api: CarouselApi | undefined) => void
  children: React.ReactNode
}) {
  return (
    <Carousel opts={{ watchDrag: false }} setApi={(api) => register(index, api)}>
      <CarouselContent>{children}</CarouselContent>
    </Carousel>
  )
}
export function MyCarousel({ signUp }: { signUp: (formData: any) => Promise<{ success: boolean; error?: string }> }) {
  const { formData, errors, updateForm, validateStep } = useRegistrationForm()

  const router = useRouter();
  const supabase = createClient();

  const [outerApi, setOuterApi] = React.useState<CarouselApi>()
  const innerApis = React.useRef<Map<number, NonNullable<CarouselApi>>>(new Map())
  const [canPrev, setCanPrev] = React.useState(false)
  const [canNext, setCanNext] = React.useState(true)
  const [isLastStep, setIsLastStep] = React.useState(false)

  const [currentOuter, setCurrentOuter] = React.useState(0)
  const [currentStep0Inner, setCurrentStep0Inner] = React.useState(0)
  const [showError, setShowError] = React.useState(false)

  const getInner = React.useCallback(() => {
    if (!outerApi) return undefined
    return innerApis.current.get(outerApi.selectedScrollSnap())
  }, [outerApi])

  const updateButtons = React.useCallback(() => {
    if (!outerApi) return
    const inner = getInner()
    setCanNext(!!inner?.canScrollNext() || outerApi.canScrollNext())
    setCanPrev(!!inner?.canScrollPrev() || outerApi.canScrollPrev())
    const onLastOuter = !outerApi.canScrollNext()
    const onLastInner = !inner?.canScrollNext()
    setIsLastStep(onLastOuter && onLastInner)

    setCurrentOuter(outerApi.selectedScrollSnap())
    const step0Api = innerApis.current.get(0)
    if (step0Api) setCurrentStep0Inner(step0Api.selectedScrollSnap())
  }, [outerApi, getInner])

  React.useEffect(() => {
    if (!outerApi) return
    updateButtons()
    outerApi.on("select", updateButtons)
    outerApi.on("reInit", updateButtons)
    return () => {
      outerApi.off("select", updateButtons)
      outerApi.off("reInit", updateButtons)
    }
  }, [outerApi, updateButtons])

  const register = React.useCallback(
    (index: number, api: CarouselApi | undefined) => {
      if (!api) {
        innerApis.current.delete(index)
        return
      }
      innerApis.current.set(index, api)
      api.off("select", updateButtons)
      api.off("reInit", updateButtons)
      api.on("select", updateButtons)
      api.on("reInit", updateButtons)
    },
    [updateButtons]
  )

  const handleSubmit = async () => {
    // 1. Sequentially run our non-redundant step validation tracks
    const isStep1Valid = validateStep(1);
    const isStep2Valid = validateStep(2);
    const isStep3Valid = validateStep(3);
    const isStep4Valid = validateStep(4);

    if (!isStep1Valid) {
      setShowError(true);
      outerApi?.scrollTo(0); // Snaps back to General Information slide
      innerApis.current.get(0)?.scrollTo(0); // Focuses page 1 inputs
      return;
    }

    if (!isStep2Valid) {
      setShowError(true);
      outerApi?.scrollTo(1);
      return;
    }

    if (!isStep3Valid) {
      setShowError(true);
      outerApi?.scrollTo(2);
      return;
    }

    if (!isStep4Valid) {
      setShowError(true);
      return;
    }

    setShowError(false);
    console.log("Submitting context form data directly to database table:", formData);

    try {
      const result = await signUp(formData);

      if (!result.success) {
        alert(result.error);
        return;
      }

      sessionStorage.setItem("signupEmail", formData.email || "");
      sessionStorage.setItem("otpSource", "signup");

      router.push("/otp");
      
    } catch (err) {
      console.error("Failed to process resident submission context data:", err);
    }
  };
  
  const handleNext = () => {
    if (!outerApi) return
    setShowError(false)

    const inner = getInner()
    if (inner?.canScrollNext()) {
      inner.scrollNext()
    } else if (outerApi.canScrollNext()) {
      outerApi.scrollNext()
      innerApis.current.get(outerApi.selectedScrollSnap())?.scrollTo(0, true)
    } else {
      handleSubmit()
    }
  }

  const handlePrev = () => {
    if (!outerApi) return
    const inner = getInner()
    if (inner?.canScrollPrev()) {
      inner.scrollPrev()
    } else if (outerApi.canScrollPrev()) {
      outerApi.scrollPrev()
      const prevInner = innerApis.current.get(outerApi.selectedScrollSnap())
      prevInner?.scrollTo(prevInner.scrollSnapList().length - 1, true)
    }
  }

  const handleProgressBar = "flex-1 min-w-0 rounded-full h-full"

  React.useEffect(() => {
    if (!showError) return
    const timer = setTimeout(() => setShowError(false), 4000)
    return () => clearTimeout(timer)
  }, [showError])
  return (
    <div className="flex flex-col w-full mx-auto">
      {showError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
          <ErrorBox message="Fix the highlighted fields before moving forward." />
        </div>
      )}

      <div className="flex flex-row justify-between w-full gap-3 px-5 h-2.5">
        <div className={`${handleProgressBar} ${currentOuter >= 0 ? "bg-[rgb(32,32,162)]" : "bg-[rgb(217,217,217)]"}`} />
        <div className={`${handleProgressBar} ${currentOuter >= 1 ? "bg-[rgb(32,32,162)]" : "bg-[rgb(217,217,217)]"}`} />
        <div className={`${handleProgressBar} ${currentOuter >= 2 ? "bg-[rgb(32,32,162)]" : "bg-[rgb(217,217,217)]"}`} />
        <div className={`${handleProgressBar} ${currentOuter >= 3 ? "bg-[rgb(32,32,162)]" : "bg-[rgb(217,217,217)]"}`} />
      </div>

      <Carousel setApi={setOuterApi} opts={{ watchDrag: false }}>
        <CarouselContent>

          <CarouselItem>
            <p className={pClass}>General Information</p>
            <InnerCarousel index={0} register={register}>

              <CarouselItem className="flex flex-col gap-2 w-full">
                <div className="flex flex-row gap-2">
                  <InputField id="firstName" name="firstName" placeholder="First Name" className="flex-3"
                    value={formData.first_name || ""} onChange={(v) => updateForm({ first_name: v })} error={errors.first_name}  />
                  <InputField id="suffix" name="suffix" placeholder="Suffix" className="flex-1"
                    value={formData.suffix || ""} onChange={(v) => updateForm({ suffix: v })} />
                </div>
                <InputField id="middleName" name="middleName" placeholder="Middle Name" className="w-full"
                  value={formData.middle_name || ""} onChange={(v) => updateForm({ middle_name: v })} />
                <InputField id="lastName" name="lastName" placeholder="Last Name" className="w-full"
                  value={formData.last_name || ""} onChange={(v) => updateForm({ last_name: v })} error={errors.last_name}  />
                <InputField id="emailAddress" name="email" placeholder="Email Address" className="w-full"
                  value={formData.email || ""} onChange={(v) => updateForm({ email: v })} error={errors.email}  />
                <InputField id="phoneNumber" name="phone" placeholder="Phone Number" className="w-full"
                  value={formData.phone || ""} onChange={(v) => updateForm({ phone: v })} error={errors.phone}  />
              </CarouselItem>

              <CarouselItem className="flex flex-col gap-2 w-full">
                <div className="flex flex-row gap-2">
                  <InputField id="age" name="age" placeholder="Age" className="flex-2"
                    value={formData.age?.toString() ?? ""} onChange={(v) => updateForm({ age: v === "" ? "" : Number(v) })} error={errors.age}  />
                  <DropdownField id="sex" name="sex" placeholder="Sex" className="flex-1"
                    options={["MALE", "FEMALE"]} value={formData.sex || ""}
                    onChange={(v) => updateForm({ sex: v as "MALE" | "FEMALE" })} error={errors.sex}  />
                </div>
                <InputField id="password" name="password" placeholder="Password" type="password" className="w-full"
                  value={formData.password || ""} onChange={(v) => updateForm({ password: v })} error={errors.password} />
                <div className="flex flex-row gap-2 items-center mb-3">
                  <CircleQuestionMark size={20} className="text-gray-400 shrink-0" />
                  <p className="text-gray-400 text-[12px] italic">
                    Your password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.
                  </p>
                </div>
                <InputField id="confirmpass" name="confirmpassword" placeholder="Confirm Password" type="password" className="w-full"
                  value={formData.confirmPassword || ""} onChange={(v) => updateForm({ confirmPassword: v })} error={errors.confirmPassword}  />
              </CarouselItem>

            </InnerCarousel>

            <div className="flex flex-row justify-center w-full gap-2 px-5 h-2.5 my-7">
              <div className={`w-2.5 rounded-full h-full ${currentStep0Inner === 0 ? "bg-[rgb(32,32,162)]" : "bg-[rgb(217,217,217)]"}`} />
              <div className={`w-2.5 rounded-full h-full ${currentStep0Inner === 1 ? "bg-[rgb(32,32,162)]" : "bg-[rgb(217,217,217)]"}`} />
            </div>
          </CarouselItem>

          <CarouselItem>
            <p className={pClass}>Occupancy</p>
            <InnerCarousel index={1} register={register}>
              <CarouselItem className="flex flex-col gap-2 w-full">
                <DropdownField
                  id="haveOccupancy" name="haveOccupancy"
                  placeholder="Do you have a permanent occupancy here?"
                  className="flex-1" options={["Yes", "No"]}
                  value={formData.has_permanent_address ? "Yes" : "No"}
                  onChange={(v) => updateForm({ has_permanent_address: v === "Yes" })}
                  error={errors.has_permanent_address}
                  hideErrorText
                />

                {formData.has_permanent_address === true && (
                  <>
                    <InputField id="permanentAddress" name="permanentAddress" placeholder="Permanent Address" className="w-full"
                      value={formData.current_address || ""} onChange={(v) => updateForm({ current_address: v })} error={errors.current_address}  />
                    <div className="flex flex-row gap-2 items-center">
                      <CircleQuestionMark size={20} className="text-gray-400 shrink-0" />
                      <p className="text-gray-400 text-[12px] italic">
                        Example: B17 L40 Tres Marias St. Greater Lagro, Quezon City
                      </p>
                    </div>
                  </>
                )}

                {formData.has_permanent_address === false && (
                <>
                  <DropdownField
                    id="haveReason" 
                    name="haveReason" 
                    placeholder="Reason?" 
                    className="flex-1"
                    options={["Rental", "Work", "Others"]}
                    value={formData.reason || ""}
                    onChange={(v) => {
                      updateForm({ reason: v, specify_reason: "" });
                    }}
                    error={errors.reason}
                  />

               
                  {formData.reason && (
                    <InputField 
                      id="otherReason" 
                      name="otherReason" 
                      placeholder="Please specify details" 
                      className="w-full"
                      value={formData.specify_reason || ""} 
                      onChange={(v) => updateForm({ specify_reason: v })} 
                      error={errors.specify_reason || errors.reason}  
                    />
                  )}

                  <InputField 
                    id="temporaryAddress" 
                    name="temporaryAddress" 
                    placeholder="What is your temporary address?" 
                    className="w-full"
                    value={formData.current_address || ""} 
                    onChange={(v) => updateForm({ current_address: v })} 
                    error={errors.current_address}  
                  />
                  
                  <div className="flex flex-row gap-2 items-center">
                    <CircleQuestionMark size={20} className="text-gray-400 shrink-0" />
                    <p className="text-gray-400 text-[12px] italic">
                      Example: B17 L40 Tres Marias St. Greater Lagro, Quezon City
                    </p>
                  </div>
                </>
              )}

              </CarouselItem>
            </InnerCarousel>
          </CarouselItem>
          <CarouselItem>
            <p className={pClass}>Medical Information</p>
            <InnerCarousel index={2} register={register}>
              <CarouselItem className="flex flex-col gap-2 w-full">
                <DropdownField
                  id="hasHistory" name="hasHistory"
                  placeholder="Do you have a history of injury, illness, or disability?"
                  className="flex-1" options={["Yes", "No"]}
                  value={formData.has_history ? "Yes" : "No"}
                  onChange={(v) => updateForm({ has_history: v === "Yes" })}
                  error={errors.has_history}
                  
                />

                {formData.has_history === true && (
                  <>
                    <InputField id="historyDetails" name="historyDetails" placeholder="Please specify your history" className="w-full"
                      value={formData.medical_description || ""} onChange={(v) => updateForm({ medical_description: v })} error={errors.medical_description} hideErrorText />
                    <div className="flex flex-row gap-2 items-center mb-3">
                      <CircleQuestionMark size={20} className="text-gray-400 shrink-0" />
                      <p className="text-gray-400 text-[12px] italic">
                        Example: Sakit sa puso, hypertension, etc.
                      </p>
                    </div>
                  </>
                )}

                <InputField id="emergencyContactName" name="emergencyContactName" placeholder="Emergency Contact Person Name" className="w-full"
                  value={formData.emergency_person || ""} onChange={(v) => updateForm({ emergency_person: v })} error={errors.emergency_person} />
                <InputField id="emergencyContactNumber" name="emergencyContactNumber" placeholder="Emergency Contact Person Number" className="w-full"
                  value={formData.emergency_contact_number || ""} onChange={(v) => updateForm({ emergency_contact_number: v })} error={errors.emergency_contact_number}  />
              </CarouselItem>
            </InnerCarousel>
          </CarouselItem>

          <CarouselItem>
            <p className={pClass}>Terms and Conditions</p>
            <InnerCarousel index={3} register={register}>
              <CarouselItem className="flex flex-col gap-2 w-full">
                <div className="p-2 border border-gray-300 rounded-lg">
                  <ScrollableBox className="max-h-67">
                    <p className="text-gray-600 text-left">
                      By creating an account or using RAPID RESPONSE, you agree to these Terms and Conditions. <b>Please read them carefully.</b>
                      <br /><br /> <b>1. Personal Information Collection</b> <br />
                      We collect the following, under the Data Privacy Act of 2012 (Republic Act No. 10173) and its Implementing Rules and Regulations:<br />
                      a. <b>General information</b>: full name, date of birth, sex, address, contact number, email address, emergency contact details, and device location when you use emergency features.
                      <br />
                      b. <b>Medical information</b>: such as blood type, allergies, existing medical conditions, medications, disabilities, and other health details you choose to provide.
                      <br />
                      c. <b>Occupation information</b>: such as employer or workplace, job title, and work address.
                      <br /><br />
                      <b>2. Reason for Collection</b> <br />
                      We process your information only for legitimate and declared purposes:<br />
                      a. To create and manage your account
                      <br />
                      b. To transmit your details and location to responders and emergency contacts when you request help
                      <br />
                      c. To help responders give appropriate and safe assistance
                      <br />
                      d. To verify your identity and prevent misuse or false reports
                      <br />
                      e. To improve the App's safety, reliability, and performance
                      <br />
                      f. To comply with legal obligations
                      <br /><br />
                      <b>3. Who Has Access to Your Information</b><br />
                      We share your information only on a need-to-know basis with:<br />
                      a. <b>Emergency responders and agencies</b> (BPSO Officers) when you trigger an emergency alert
                      <br />
                      b. <b>Service providers</b> that help us operate the App (e.g., cloud hosting and call services), who are bound by data sharing or outsourcing agreements and must protect your data
                      <br />
                      c. <b>Government authorities</b>, when required by law, court order, or lawful request
                      <br /><br />
                      <b>4. Location and Device Permissions</b><br />
                      The App may request access to your location, notifications, contacts, and other device features. These are used only to provide emergency functions. You can change permissions in your device settings, but some features may not work without them.
                    </p>
                  </ScrollableBox>
                </div>
                <Checkbox
                  id="terms" name="terms"
                  label="I agree to the terms and conditions and I consent to the collection and processing of my personal information for emergency response purposes."
                  className="flex-1 italic"
                  checked={!!formData.terms}
                  onChange={(v) => updateForm({ terms: !!v })}
                  error={errors.terms}
                  
                />
              </CarouselItem>
            </InnerCarousel>
          </CarouselItem>

        </CarouselContent>
      </Carousel>

      <div className="flex flex-col items-center gap-2 mt-4">
        <Button className={buttonClass} onClick={handleNext} disabled={!canNext && !isLastStep}>
          {isLastStep ? "Submit" : "Next"}
        </Button>
        <Button className={`${buttonClass} bg-gray-700`} onClick={handlePrev} disabled={!canPrev}>Back</Button>
      </div>
    </div>
  )
}
