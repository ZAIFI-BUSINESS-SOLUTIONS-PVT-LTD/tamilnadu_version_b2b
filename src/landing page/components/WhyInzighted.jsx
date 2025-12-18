import React, { useRef, useState, useEffect } from 'react';
import face1 from '../../assets/landingpage-images/faces/face1.jpg';
import face2 from '../../assets/landingpage-images/faces/face2.jpg';
import face3 from '../../assets/landingpage-images/faces/face3.jpg';
import face4 from '../../assets/landingpage-images/faces/face4.jpg';
import face5 from '../../assets/landingpage-images/faces/face5.jpg';
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Users, BadgeCheck, Target, Clock } from 'lucide-react';
import { useInView } from 'framer-motion';

const avatarImages = [face1, face2, face3, face4, face5];

const benefits = [
	{
		icon: Target,
		title: "Personalized Insights",
		description: "Tailored analysis for students, teachers, and administrators to optimize learning outcomes."
	},
	{
		icon: Clock,
		title: "Real-Time Updates",
		description: "Instant notifications and detailed reports for parents to stay informed about their child's progress."
	},
	{
		icon: Users,
		title: "No Arguments",
		description: "Bridge the gap between parents and teachers with data-driven discussions and eliminate misunderstandings."
	}
];

const introAnimation = {
	initial: { opacity: 0, y: 50 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true },
	transition: { duration: 1, ease: 'easeOut' },
};

// 3D Tilt Card Component
const TiltCard = ({ children }) => {
	const ref = useRef(null);
	const handleMouseMove = (e) => {
		const card = ref.current;
		if (!card) return;
		const rect = card.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const y = e.clientY - rect.top;
		const centerX = rect.width / 2;
		const centerY = rect.height / 2;
		const rotateX = ((y - centerY) / centerY) * 15; // max 15deg
		const rotateY = ((x - centerX) / centerX) * -15;
		card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04,1.04,1.04)`;
		card.style.boxShadow = '0 12px 32px 0 rgba(30, 64, 175, 0.10), 0 2px 8px 0 rgba(0,0,0,0.04)';
	};
	const handleMouseLeave = () => {
		const card = ref.current;
		if (!card) return;
		card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
		card.style.boxShadow = '';
	};
	return (
		<div
			ref={ref}
			className="flex flex-col items-center justify-center p-3 sm:p-6 w-full text-center border rounded-2xl bg-white transition-transform duration-300 ease-[cubic-bezier(.25,.8,.25,1)] will-change-transform overflow-hidden min-w-0"
			style={{ transformStyle: 'preserve-3d' }}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			{children}
		</div>
	);
};


const OverviewSection = () => {
	const marqueeRef = useRef(null);
	const isMarqueeInView = useInView(marqueeRef, { margin: '-100px 0px', once: true });
	return (
		<motion.section
			className="pt-16 sm:pt-24 pb-6 md:pb-20 bg-blue-50 relative overflow-hidden"
			initial={introAnimation.initial}
			whileInView={introAnimation.whileInView}
			viewport={{ once: true }}
			transition={introAnimation.transition}
		>
			{/* Clean minimal background */}
			<div className="relative z-10 w-full max-w-screen-2xl mx-auto items-center px-3 sm:px-4 md:px-8">
				{/* Header Section */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.6 }}
					className="mx-auto text-center mb-6 sm:mb-8"
				>
					<div className="inline-flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6">
						<span className="bg-gradient-to-tr from-blue-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent font-bold">Why Choose InzightEd</span>
					</div>
					<h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
						Why Inzight<span className="text-blue-500">Ed?</span>
					</h2>
					<p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed text-center">
						Discover the transformative power of data-driven education with InzightEd. Elevate learning outcomes, streamline communication, and empower every stakeholder in the educational journey.
					</p>
					{/* Avatars Row for Social Proof using DaisyUI avatar group */}
					<div className="avatar-group -space-x-4 justify-center mt-4 mb-2">
						<div className="avatar">
							<div className="w-10">
								<img src={face1} alt="User avatar 1" loading="lazy" />
							</div>
						</div>
						<div className="avatar">
							<div className="w-10">
								<img src={face2} alt="User avatar 2" loading="lazy" />
							</div>
						</div>
						<div className="avatar">
							<div className="w-10">
								<img src={face3} alt="User avatar 3" loading="lazy" />
							</div>
						</div>
						<div className="avatar">
							<div className="w-10">
								<img src={face4} alt="User avatar 4" loading="lazy" />
							</div>
						</div>
						<div className="avatar">
							<div className="w-10">
								<img src={face5} alt="User avatar 5" loading="lazy" />
							</div>
						</div>
					</div>
				</motion.div>

				{/* Video on top */}
				<div className="mt-12">
					<motion.div
						initial={{ opacity: 0, scale: 0.98 }}
						whileInView={{ opacity: 1, scale: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.6 }}
						className="w-full rounded-2xl overflow-hidden shadow-lg bg-white border"
					>
						{/* responsive aspect: 4:3 on small screens (taller), 16:9 on md+ */}
						<div className="w-full aspect-[4/3] md:aspect-video">
							<iframe
								src="https://www.youtube.com/embed/VHnmQqFfWkw"
								title="InzightEd Demo Video"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowFullScreen
								className="w-full h-full rounded-xl border-0"
								loading="lazy"
							></iframe>
						</div>
					</motion.div>
				</div>

				{/* Three cards in a row beneath the video */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
					{benefits.map((benefit, index) => (
						<motion.div
							key={index}
							initial={{ opacity: 0, y: 20 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: index * 0.08 }}
						>
							<TiltCard>
								<div className="mb-4">
									<div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
										<benefit.icon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
									</div>
								</div>
								<h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">{benefit.title}</h3>
								<p className="text-sm sm:text-base text-gray-600 leading-relaxed">{benefit.description}</p>
							</TiltCard>
						</motion.div>
					))}
				</div>
			</div>
		</motion.section>
	);
};

export default OverviewSection;