import React, { useRef, useState, useEffect } from 'react';
import { useInView } from 'framer-motion';
import { motion } from 'framer-motion';

import { Activity, AlarmClockCheck, ChartLine, HeartHandshake, SmartphoneNfc, Sparkles } from './animatedicons/AnimatedIcons';
import { DotBackground } from './animations/DotBackground';
import { Marquee } from '../../components/magicui/marquee';
import LongitudinalInsightsAnimation from './animations/LongitudinalInsightsAnimation';
import HyperPreciseAnalysisAnimation from './animations/HyperPreciseAnalysisAnimation';

const headerTitle = (
	<div>
		<span className="inline-flex items-center gap-2 bg-white px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4 sm:mb-6 shadow-lg">
			<span className="bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent font-bold">The Smartest Way</span>
		</span>
		<h2 id="why-section-heading" className="block text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
			What makes{' '}
			<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600">InzightEd{' '}</span>
			special in your journey?
		</h2>
	</div>
);

const headerDescription = (
	<p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed block">
		InzightEd is your intelligent study companion that accelerates your education with cutting-edge AI.
	</p>
);

const introAnimation = {
	initial: { opacity: 0, y: 50 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true },
	transition: { duration: 1, ease: 'easeOut' },
};


// Feature cards data
const featureCards = [
	{
		icon: <Activity width={80} height={80} animate="animate" color="#3b82f6" stroke="#3b82f6" fill="none" strokeWidth={1} strokeOpacity={0.5} style={{ opacity: 0.12 }} />,
		title: "Designed for Real Results",
		desc: "Improves your exam performance and understanding."
	},
	{
		icon: <SmartphoneNfc width={80} height={80} animate="animate" color="#10b981" stroke="#10b981" fill="none" strokeWidth={1} strokeOpacity={0.5} style={{ opacity: 0.12 }} />,
		title: "Built for Digital and Paper-Based Exam Tests",
		desc: "Prepare online or on paper with instant feedback."
	},
	{
		icon: <AlarmClockCheck width={80} height={80} animate="animate" color="#f59e0b" stroke="#f59e0b" fill="none" strokeWidth={1} strokeOpacity={0.5} style={{ opacity: 0.12 }} />,
		title: "Instant Actionable Feedback",
		desc: "Get next steps and improvement areas instantly."
	},
	{
		icon: <Sparkles width={80} height={80} animate="animate" color="#8b5cf6" stroke="#8b5cf6" fill="none" strokeWidth={1} strokeOpacity={0.5} style={{ opacity: 0.12 }} />,
		title: "Built with Top Exam Experts' Guidance",
		desc: "Expert-designed to boost confidence and success."
	},
	{
		icon: <ChartLine width={80} height={80} animate="animate" color="#2563eb" stroke="#2563eb" fill="none" strokeWidth={1} strokeOpacity={0.5} style={{ opacity: 0.12 }} />,
		title: "Effortless Progress Tracking",
		desc: "View strengths and weaknesses with charts and insights."
	},
];

// helper: create stable slug ids
const slugify = (s) =>
	String(s || '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9\-]/g, '');

const ReviewCard = ({ icon, title, desc, compact = false }) => {
	const titleClass = compact ? 'text-base font-bold text-gray-900 text-left' : 'text-xl md:text-2xl font-semibold text-gray-900 text-left';
	const descClass = compact ? 'text-sm text-gray-600 text-left w-full' : 'text-base md:text-lg text-gray-700 leading-relaxed text-left w-full';
	const id = slugify(title);

	return (
		<figure id={id} aria-labelledby={`${id}-title`} className="relative h-full w-64 overflow-hidden rounded-xl border p-4 border-gray-200 bg-white">
			<div className="absolute bottom-2 right-2 opacity-10 pointer-events-none select-none z-0">
				{React.cloneElement(icon, { width: 80, height: 80, strokeWidth: 1, style: { opacity: 1 } })}
			</div>
			<div className="flex flex-col items-start gap-2 w-full relative z-10">
				<div className="flex flex-row items-center w-full mb-2">
					<figcaption id={`${id}-title`} className={titleClass}>{title}</figcaption>
				</div>
				<blockquote className={descClass}>{desc}</blockquote>
			</div>
		</figure>
	);
};


const WhyInzighted = () => {
	const sectionRef = useRef(null);
	// split features for the marquee
	const firstRow = featureCards.slice(0, Math.ceil(featureCards.length / 2));

	// Lazy load animations only when in view
	const longitudinalRef = useRef(null);
	const hyperPreciseRef = useRef(null);
	const longitudinalRefMobile = useRef(null);
	const hyperPreciseRefMobile = useRef(null);
	const marqueeRef = useRef(null);
	// allow these animations to re-start each time they come into view
	const isLongitudinalInView = useInView(longitudinalRef, { margin: '-100px 0px' });
	const isHyperPreciseInView = useInView(hyperPreciseRef, { margin: '-100px 0px' });
	const isLongitudinalMobileInView = useInView(longitudinalRefMobile, { margin: '-100px 0px' });
	const isHyperPreciseMobileInView = useInView(hyperPreciseRefMobile, { margin: '-100px 0px' });
	const isMarqueeInView = useInView(marqueeRef, { margin: '-100px 0px', once: true });
	// Mobile carousel state
	const slidesRef = useRef(null);
	const [activeIndex, setActiveIndex] = useState(0);

	// Inject ItemList JSON-LD for featureCards (includes anchor URLs)
	useEffect(() => {
		const base = window.location.origin + window.location.pathname;
		const itemList = {
			"@context": "https://schema.org",
			"@type": "ItemList",
			itemListElement: featureCards.map((f, i) => ({
				"@type": "ListItem",
				position: i + 1,
				item: { "@type": "Service", name: f.title, description: f.desc, url: `${base}#${slugify(f.title)}` }
			}))
		};

		const script = document.createElement('script');
		script.type = 'application/ld+json';
		script.text = JSON.stringify(itemList);
		document.head.appendChild(script);

		return () => script.remove();
	}, []);

	useEffect(() => {
		const el = slidesRef.current;
		if (!el) return;
		const onScroll = () => {
			// calculate active slide based on scrollLeft
			const scrollLeft = el.scrollLeft;
			const width = el.clientWidth;
			const idx = Math.round(scrollLeft / width);
			setActiveIndex(idx);
		};
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => el.removeEventListener('scroll', onScroll);
	}, []);

	return (
		<motion.section
			ref={sectionRef}
			className="bg-white relative overflow-hidden pb-12 pt-8"
			{...introAnimation}
			role="region"
			aria-labelledby="why-section-heading"
		>
			<DotBackground />

			<div className="relative z-10 h-full flex flex-col w-full max-w-screen-2xl mx-auto items-center px-3 sm:px-4 md:px-8 gap-8">
				<div className="w-full flex flex-col justify-center items-start">
					<motion.div className="w-full" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: 'easeOut' }}>
						<div className="flex flex-col items-center justify-start w-full">
							<div className="w-full flex flex-col items-start">
								<div className="mb-2 w-full flex justify-center text-center">{headerTitle}</div>
								<div className="w-full flex justify-center text-center">{headerDescription}</div>
							</div>
						</div>
					</motion.div>
				</div>

				<div className="w-full flex flex-col items-center mt-4">
					{/* Desktop: two-column layout; Mobile: carousel below (mobile-only) */}
					<div className="w-full max-w-7xl">
						{/* Mobile carousel - visible only on small screens */}
						<div className="block md:hidden w-full">
							<div className="relative">
								<div
									ref={slidesRef}
									className="slides-container overflow-x-auto flex snap-x snap-mandatory touch-auto -mx-4 px-4 scrollbar-hide"
								>
									<div className="flex-none w-full snap-center px-4">
										<figure className="relative w-full min-h-[20rem] overflow-hidden rounded-2xl border p-4 border-gray-200 bg-white flex flex-col justify-between">
											<div className="w-full flex justify-center">
												<div ref={longitudinalRefMobile} className="w-full aspect-square rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden">
													{isLongitudinalMobileInView && <LongitudinalInsightsAnimation />}
												</div>
											</div>
											<div className="flex flex-col items-start gap-2 w-full relative z-10 mt-4">
												<div className="flex flex-row items-center w-full">
													<figcaption id="longitudinal-insights-mobile-title" className="text-lg font-semibold text-gray-900 text-left">Longitudinal Insights</figcaption>
												</div>
												<blockquote aria-labelledby="longitudinal-insights-mobile-title" className="text-sm text-gray-700 text-left w-full">InzightEd combines results from every mock, updating trends after each test so you can see real progress, not just for the last attended mock test.</blockquote>
											</div>
										</figure>
									</div>

									<div className="flex-none w-full snap-center px-4">
										<figure className="relative w-full min-h-[20rem] overflow-hidden rounded-2xl border p-4 border-gray-200 bg-white flex flex-col justify-between">

											<div className="w-full flex justify-center">
												<div ref={hyperPreciseRefMobile} className="w-full aspect-square rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden">
													{isHyperPreciseMobileInView && <HyperPreciseAnalysisAnimation />}
												</div>
											</div>
											<div className="flex flex-col items-start gap-2 w-full relative z-10 mt-4">
												<div className="flex flex-row items-center w-full">
													<figcaption id="hyper-precise-analysis-mobile-title" className="text-lg font-semibold text-gray-900 text-left">Hyper Precise Analysis</figcaption>
												</div>
												<blockquote aria-labelledby="hyper-precise-analysis-mobile-title" className="text-sm text-gray-700 text-left w-full">Insights drill down to topic and subtopic levels so you know exactly which chapters and subtopics need attention for focused, targeted improvement.</blockquote>
											</div>
										</figure>
									</div>
								</div>

								{/* Indicators for mobile carousel */}
								<div className="flex items-center justify-center gap-2 mt-3">
									{[0, 1].map((i) => (
										<button
											key={i}
											aria-label={`Go to slide ${i + 1}`}
											onClick={() => {
												const el = slidesRef.current;
												if (!el) return;
												el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
											}}
											className={`${i === activeIndex ? 'w-8 h-2 bg-blue-600 rounded-full' : 'w-2 h-2 bg-gray-300 rounded-full'}`}
										/>
									))}
								</div>
							</div>
						</div>

						{/* Desktop grid - hidden on mobile */}
						<div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-12">
							<figure className="relative h-full w-full overflow-hidden rounded-2xl border p-4 border-gray-200 bg-white flex flex-col">
								<div className="flex flex-col items-start gap-2 w-full relative z-10 mb-2">
									<div className="flex flex-row items-center w-full">
										<figcaption className="text-lg md:text-xl font-semibold text-gray-900 text-left">Beyond One Test </figcaption>
									</div>
									<blockquote className="text-sm md:text-base text-gray-700 text-left w-full">InzightEd brings together results from all your mock tests, updating after each one so you track true progress, not just your latest score.</blockquote>
								</div>
								<div className="w-full flex justify-center mt-2">
									<div ref={longitudinalRef} className="w-full aspect-square md:aspect-auto md:h-96 rounded-2xl bg-blue-50 flex items-center justify-center">
										{isLongitudinalInView && <LongitudinalInsightsAnimation />}
									</div>
								</div>
							</figure>

							<figure className="relative h-full w-full overflow-hidden rounded-2xl border p-4 border-gray-200 bg-white flex flex-col">
								<div className="flex flex-col items-start gap-2 w-full relative z-10 mb-2">
									<div className="flex flex-row items-center w-full">
										<figcaption className="text-lg md:text-xl font-semibold text-gray-900 text-left">Hyper Precise Analysis</figcaption>
									</div>
									<blockquote className="text-sm md:text-base text-gray-700 text-left w-full">Insights drill down to topic and subtopic levels so you know exactly which chapters and subtopics need attention for focused, targeted improvement.</blockquote>
								</div>
								<div className="w-full flex justify-center mt-2">
									<div ref={hyperPreciseRef} className="w-full aspect-square md:aspect-auto md:h-96 rounded-2xl bg-blue-50 flex items-center justify-center overflow-hidden">
										{isHyperPreciseInView && <HyperPreciseAnalysisAnimation />}
									</div>
								</div>
							</figure>
						</div>
					</div>

					<div className="w-full flex flex-col justify-center items-center p-6 lg:p-12 relative">
						<div ref={marqueeRef} className="relative w-full max-w-7xl flex flex-col gap-4 items-center justify-center scrollbar-hide">
							{isMarqueeInView && (
								<Marquee pauseOnHover className="[--duration:20s] w-full">
									{featureCards.map((card, i) => (
										<ReviewCard key={card.title || i} compact {...card} />
									))}
								</Marquee>
							)}
						</div>
					</div>
				</div>
			</div>
		</motion.section>
	);
};

export default WhyInzighted;
