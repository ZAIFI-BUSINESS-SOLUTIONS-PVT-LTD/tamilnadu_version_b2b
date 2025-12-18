import React, { useRef } from 'react';
import { useInView } from 'framer-motion';
import { Marquee } from '../../components/magicui/marquee';

import amritaLogo from '../../assets/landingpage-images/recognitions/amrita.jpg';
import ediLogo from '../../assets/landingpage-images/recognitions/EDI.jpeg';
import msmeLogo from '../../assets/landingpage-images/recognitions/msme.jpg';
import ngitbiLogo from '../../assets/landingpage-images/recognitions/ngitbi.jpg';
import startupIndiaLogo from '../../assets/landingpage-images/recognitions/startup-india.jpg';
import tamilpreneurLogo from '../../assets/landingpage-images/recognitions/tamilpreneur.png';
import vibrantGujaratLogo from '../../assets/landingpage-images/recognitions/vibrantgujarat.jpg';

const defaultItems = [
    { src: amritaLogo, alt: 'Amrita Vishwa Vidyapeetham' },
    { src: ediLogo, alt: 'Entrepreneurship Development Institute' },
    { src: msmeLogo, alt: 'MSME (Govt of India)' },
    { src: ngitbiLogo, alt: 'NGI TBi' },
    { src: startupIndiaLogo, alt: 'Startup India' },
    { src: vibrantGujaratLogo, alt: 'Vibrant Gujarat' },
    { src: tamilpreneurLogo, alt: 'Tamilpreneur' },
];

export default function Recognitions({ items = [] }) {
    const marqueeRef = useRef(null);
    const isInView = useInView(marqueeRef, { margin: '-100px 0px', once: true });
    const list = (items && items.length) ? items : defaultItems;

    return (
        <section className="w-full pt-8 sm:pt-12 pb-6 md:pb-20  flex flex-col items-center" style={{ perspective: '1200px' }}>
            <div className="w-full bg-white max-w-screen-2xl px-8">
                <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-8">Recognized and supported by</h3>
                <div ref={marqueeRef} className="relative w-full flex flex-col gap-4 items-center justify-center scrollbar-hide">
                    {isInView && (
                        <Marquee pauseOnHover className="[--duration:30s] w-full">
                            {list.map((r, i) => (
                                <div key={i} className="flex items-center justify-center p-6 w-32 flex-shrink-0">
                                    <img
                                        src={r.src}
                                        alt={r.alt}
                                        loading="lazy"
                                        className="w-full h-18 object-contain grayscale opacity-70 hover:grayscale-0 hover:opacity-100 transition-all duration-200"
                                    />
                                </div>
                            ))}
                        </Marquee>
                    )}
                </div>
            </div>
        </section>
    );
}
