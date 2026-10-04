'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { MyCarousel } from '@/components/resident-comps/Carousel';
import {FormProvider } from '@/components/context/RegistrationContext';
import {signUpResident} from './actions';

export default function RegisterPage() {
    const router = useRouter();
    const [bgHeight, setBgHeight] = useState<number>();

    useEffect(() => {
        const measure = () => setBgHeight(screen.height)
        measure()
        const onOrient = () => setTimeout(measure, 300)
        window.addEventListener('orientationchange', onOrient)
        return () => window.removeEventListener('orientationchange', onOrient)
    }, [])

    const handleBack = () => {
        router.push('/resident/login');
    }

    return (
        <div className="fixed top-0 left-0 h-lvh w-screen bg-white overflow-hidden">
            <div
                className="absolute left-0 top-0 h-lvh w-full"
                style={{ height: bgHeight }}>
                <div className="absolute inset-0 bg-gradient-to-b from-[rgba(35,35,184,0.90)] to-white]" />
                <div className="absolute inset-0 bg-transparent
                bg-[radial-gradient(rgba(255,255,255,0.15)_2px,transparent_1px)] 
                [background-size:24px_24px]"/>
            </div>
            <button type="button" className="cursor-pointer z-90 absolute top-0 left-0 p-7 bg-white/0"
                onClick={handleBack}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.8} stroke="white" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
            </button>
            {/* <div className="absolute inset-x-0 top-17 z-90 bg-black/0 p-1 pl-4 md:pl-0 md:inset-x-auto md:left-1/2 md:top-12 md:w-140 md:-translate-x-1/2">
                <p className="text-white text-[35px] md:text-[30px] font-bold text-left">
                    Register your <br/> Resident Account
                </p>
            </div> */}
            <div className="absolute inset-0 flex items-end md:justify-center">
                <div className="z-100 relative w-full md:w-140 flex bottom-0 rounded-t-[4vh] bg-white p-5 py-7 justify-center h-11/14 md:h-8/10">
                    <p className="absolute bottom-full mb-3 left-0 ml-5 text-white text-[35px] md:text-[30px] font-bold text-left">
                        Register your <br /> Resident Account
                    </p>
                    <FormProvider>
                        <MyCarousel signUp={signUpResident} />
                    </FormProvider>
                </div>
            </div>
        </div>
    )
}