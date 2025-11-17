import React, { useRef, useState, useEffect } from 'react';
import face1 from '../../assets/landingpage-images/faces/face1.jpg';
import face2 from '../../assets/landingpage-images/faces/face2.jpg';
import face3 from '../../assets/landingpage-images/faces/face3.jpg';
import face4 from '../../assets/landingpage-images/faces/face4.jpg';
import face5 from '../../assets/landingpage-images/faces/face5.jpg';
import { motion, AnimatePresence } from "framer-motion";
import { Quote, TrendingUp, Users, BadgeCheck, ChevronLeft, ChevronRight } from 'lucide-react';
// Accessible testimonials and lightweight structured data

const avatarImages = [face1, face2, face3, face4, face5];

const testimonials = [
	{
		quote: "InzightEd showed me exactly what to focus on for my NEET preparation. With their guidance and analytics, my score improved a lot in just two months, and I felt much more confident going into the exam.",
		author: "Sanjay Kumar",
		role: "NEET 2025 Aspirant"
	},
	{
		quote: "The mock tests on InzightEd felt just like the real JEE exam. Practicing different question complexities was super quick, and the instant feedback helped me improve my weak areas efficiently.",
		author: "Venkatesan N",
		role: "JEE 2025 Aspirant"
	},
	{
		quote: "I got to know my weak spots in any subject and could test those specific topics—really useful for targeted practice. The detailed reports made it easy to track my progress and stay motivated.",
		author: "Sneha Reddy",
		role: "CAT 2024 Aspirant"
	},
	{
		quote: "With InzightEd, I could identify my weak spots in any subject and test those specific topics as often as I needed. The platform's insights and recommendations were really useful for my UPSC journey.",
		author: "Thenmozhi  K",
		role: "UPSC 2024 Aspirant"
	}
];

// Export a named dataset usable by other components (SEO, pages)
export const testimonialsData = testimonials.map(t => ({ authorName: t.author, authorRole: t.role, quote: t.quote }));

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
			className="flex flex-row md:flex-col items-center justify-center p-4 sm:p-6 w-full md:w-1/3 text-left md:text-center border rounded-2xl bg-white transition-transform duration-300 ease-\[cubic-bezier(.25,.8,.25,1)\] will-change-transform overflow-hidden min-w-0"
			style={{ transformStyle: 'preserve-3d' }}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
		>
			{children}
		</div>
	);
};

const OverviewSection = () => {
	const [activeIndex, setActiveIndex] = useState(0);
	const [direction, setDirection] = useState(0); // -1 for left, 1 for right
	const testimonialCount = testimonials.length;
	const maxIndex = testimonialCount - 1;
	const [isAutoPlaying, setIsAutoPlaying] = useState(true);

	// Inject Review JSON-LD for testimonials (only when we have data)
	useEffect(() => {
		if (!testimonials || testimonials.length === 0) return;
		const buildReviews = () => testimonials.map((t) => ({
			"@type": "Review",
			author: { "@type": "Person", name: t.author },
			reviewBody: t.quote,
			name: `${t.author} — ${t.role}`
		}));

		const payload = {
			"@context": "https://schema.org",
			"@type": "ItemList",
			itemListElement: buildReviews().map((r, idx) => ({
				"@type": "ListItem",
				position: idx + 1,
				item: r
			}))
		};

		const script = document.createElement('script');
		script.type = 'application/ld+json';
		script.text = JSON.stringify(payload);
		document.head.appendChild(script);
		return () => script.remove();
	}, []);

	useEffect(() => {
		if (!isAutoPlaying) return;
		const interval = setInterval(() => {
			setActiveIndex((prev) => {
				const next = prev >= maxIndex ? 0 : prev + 1;
				// indicate forward movement for animation
				setDirection(1);
				return next;
			});
		}, 4000);
		return () => clearInterval(interval);
	}, [isAutoPlaying, maxIndex]);

	const handlePrev = () => {
		setIsAutoPlaying(false);
		setDirection(-1);
		setActiveIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
	};

	const handleNext = () => {
		setIsAutoPlaying(false);
		setDirection(1);
		setActiveIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
	};

	return (
		<motion.section
			className="pt-16 sm:pt-24 pb-6 md:pb-20 bg-blue-50 relative overflow-hidden"
			initial={introAnimation.initial}
			whileInView={introAnimation.whileInView}
			viewport={{ once: true }}
			transition={introAnimation.transition}
		>
			{/* Decorative subtle gradient and pattern background */}
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
						<span className="bg-gradient-to-tr from-blue-600 via-fuchsia-500 to-orange-400 bg-clip-text text-transparent font-bold">Trusted by Top Achievers</span>
					</div>
					<h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600 leading-tight mb-4 sm:mb-6">
						Success Stories
						<br />
						<span className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900">that Inspires Excellence</span>
					</h2>
					<p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed text-center">
						Join thousands of students who transformed their Exam preparation with InzightEd
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
						<div className="avatar placeholder">
							<div className="w-10 bg-gray-800 text-white text-xs">
								<span>+2K</span>
							</div>
						</div>
					</div>
				</motion.div>

				{/* Testimonials Carousel */}
				{/* Reduce top margin on small screens so avatars and quote are closer on mobile */}
				<div className="mx-auto relative rounded-2xl mt-20 md:mt-16 ">
					<div className="w-full relative p-8 sm:p-12 lg:p-16 text-center min-h-[280px] flex flex-col justify-center">
						<AnimatePresence initial={false} custom={direction}>
							<motion.div
								key={activeIndex}
								custom={direction}
								initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
								animate={{ x: 0, opacity: 1 }}
								exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
								transition={{ x: { type: 'spring', stiffness: 400, damping: 40 }, opacity: { duration: 0.2 } }}
								className="absolute inset-0 flex flex-col items-center justify-center text-gray-800 p-8 sm:p-12 lg:p-16"
								style={{ pointerEvents: 'auto' }}
							>
								{/* Quote Icon */}
								{/* Reduced vertical margin on small screens to avoid excessive top/bottom spacing */}
								<div className="mb-6 md:mb-8">
									<Quote className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-gray-200" />
								</div>
								{/* Testimonial Text */}
								<blockquote className="text-base md:text-lg text-gray-700 leading-relaxed mb-6 font-medium max-w-3xl mx-auto">
									"{testimonials[activeIndex].quote}"
								</blockquote>
								{/* Name */}
								<div id={`testimonial-author-${activeIndex}`} className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">{testimonials[activeIndex].author}</div>
								{/* Role */}
								<div className="text-sm text-gray-500 font-medium mb-2">{testimonials[activeIndex].role}</div>
							</motion.div>
						</AnimatePresence>
					</div>

					{/* Carousel Controls and Indicators */}
					<div className="flex items-center justify-center gap-4 pb-6 mt-16">
						{/* Left Arrow */}
						<button
							onClick={handlePrev}
							className="w-10 h-10 sm:w-12 sm:h-12 bg-white border-slate-200 rounded-full border flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-gray-100 transition-all shadow-md"
							aria-label="Previous testimonial"
						>
							<span className="sr-only">Previous</span>
							<ChevronLeft className="w-6 h-6" />
						</button>
						{/* Indicators */}
						<div className="flex items-center space-x-2">
							{testimonials.map((_, idx) => (
								<button
									key={idx}
									onClick={() => {
										setIsAutoPlaying(false);
										// choose direction based on index change so animation matches order
										setDirection(idx > activeIndex ? 1 : -1);
										setActiveIndex(idx);
									}}
									className={`w-2 h-2 rounded-full ${activeIndex === idx ? 'bg-blue-600' : 'bg-gray-200'} transition-colors`}
									aria-label={`Go to testimonial ${idx + 1}`}
								/>
							))}
						</div>
						{/* Right Arrow */}
						<button
							onClick={handleNext}
							className="w-10 h-10 sm:w-12 sm:h-12 bg-white border-slate-200 rounded-full border flex items-center justify-center text-slate-600 hover:text-slate-800 hover:bg-gray-100 transition-all shadow-md"
							aria-label="Next testimonial"
						>
							<span className="sr-only">Next</span>
							<ChevronRight className="w-6 h-6" />
						</button>
					</div>
				</div>
				<div>
					{/* Mobile: compact DaisyUI stat cards (mobile-only) */}
					<div className="w-full max-w-xs md:hidden mx-auto mt-8 flex flex-col gap-0">
						<div className="stat bg-white rounded-xl rounded-b-none p-3 flex items-center border-b">
							<div className="stat-figure mr-3">
								<div className="rounded-full bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 p-2 flex items-center justify-center">
									<TrendingUp className="w-5 h-5 text-white" />
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<div className="stat-title text-sm text-gray-500 break-words whitespace-normal">Average student sees a 20–30% increase in scores within 3 months</div>
							</div>
						</div>

						<div className="stat bg-white p-3 flex items-center border-b">
							<div className="stat-figure mr-3">
								<div className="rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 p-2 flex items-center justify-center">
									<Users className="w-5 h-5 text-white" />
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<div className="stat-title text-sm text-gray-500 break-words whitespace-normal">Adopted by top coaching institutes</div>
							</div>
						</div>

						<div className="stat bg-white rounded-xl rounded-t-none p-3 flex items-center">
							<div className="stat-figure mr-3">
								<div className="rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-lime-400 p-2 flex items-center justify-center">
									<BadgeCheck className="w-5 h-5 text-white" />
								</div>
							</div>
							<div className="flex-1 min-w-0">
								<div className="stat-title text-sm text-gray-500 break-words whitespace-normal">Endorsed by the Tamil Nadu government under TANSEED</div>
							</div>
						</div>
					</div>

					{/* Achievements Section with Interactive 3D Tilt (md+ only) */}
					<div
						className="max-w-6xl mx-auto mt-12 sm:mt-16 hidden md:flex md:flex-row justify-center items-start gap-6 sm:gap-8 lg:gap-10"
						style={{ perspective: '1200px' }}
					>
						{/* Achievement Card 1 */}
						<TiltCard>
							<div className="rounded-full bg-gradient-to-br from-fuchsia-500 via-pink-500 to-orange-400 p-3 sm:p-4 mr-4 mb-3 sm:mb-4 md:mb-4 md:mr-0 flex items-center justify-center">
								<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
							</div>
							<span className="text-sm sm:text-base md:text-lg font-medium text-slate-700 text-left md:text-center flex-1 min-w-0 break-words whitespace-normal">Average student sees a 20–30% increase in scores within 3 months</span>
						</TiltCard>
						{/* Achievement Card 2 */}
						<TiltCard>
							<div className="rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-500 p-3 sm:p-4 mr-4 mb-3 sm:mb-4 md:mb-4 md:mr-0 flex items-center justify-center">
								<Users className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
							</div>
							<span className="text-sm sm:text-base md:text-lg font-medium text-slate-700 text-left md:text-center flex-1 min-w-0 break-words whitespace-normal">Adapted by top coaching institutes across India</span>
						</TiltCard>
						{/* Achievement Card 3 */}
						<TiltCard>
							<div className="rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-lime-400 p-3 sm:p-4 mr-4 mb-3 sm:mb-4 md:mb-4 md:mr-0 flex items-center justify-center">
								<BadgeCheck className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
							</div>
							<span className="text-sm sm:text-base md:text-lg font-medium text-slate-700 text-left md:text-center flex-1 min-w-0 break-words whitespace-normal">Endorsed by the Tamil Nadu government under TANSEED</span>
						</TiltCard>
					</div>
				</div>
			</div>

			{/* Crawlable, hidden list of testimonials to ensure search engines can index full testimonial text */}
			<ul className="sr-only" aria-hidden="true">
				{testimonials.map((t, i) => (
					<li key={i} id={`testimonial-text-${i}`}>
						<strong>{t.author}</strong>: {t.quote}
					</li>
				))}
			</ul>
		</motion.section>
	);
};

export default OverviewSection;