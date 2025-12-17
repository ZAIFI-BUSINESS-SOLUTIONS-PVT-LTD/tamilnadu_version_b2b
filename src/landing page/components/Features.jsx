// Features section: accessibility and lightweight SEO-ready markup
import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import { ClipboardCheck, ListChecks, BarChart3, Sparkle, TrendingUp, MessageSquareQuote } from "lucide-react";
import { motion } from 'framer-motion';
import { MagicCard } from "../../components/magicui/magic-card.jsx";
import { PointerHighlight } from "../../components/ui/pointer-highlight.jsx";
// removed AIChatbotAnimation (AI Chatbot card removed)

const features = [
	{
		icon: ClipboardCheck,
		title: "Student Insight",
		description: "A student mixes up mass and weight across multiple questions. InzightEd highlights the exact concept overlap causing the confusion and shows how it reflects in later answers — helping learners understand where clarity was lost.",
		accent: "from-sky-400 via-blue-400 to-indigo-400"
	},
	{
		icon: ListChecks,
		title: "Teacher Insight",
		description: "Several students confuse speed and time while solving problems. InzightEd surfaces this recurring pattern across evaluations, helping teachers spot concept-level misunderstandings early within their class.",
		accent: "from-emerald-300 via-teal-300 to-cyan-300"
	},
	{
		icon: BarChart3,
		title: "Student Insight (With Evidence)",
		description: "Out of 200 questions, 120 marks were lost due to repeated conceptual mix-ups. InzightEd breaks this down with clear evidence, showing which concepts contributed most to the loss — no guesswork, only clarity.",
		accent: "from-fuchsia-300 via-purple-400 to-indigo-400"
	},
	{
		icon: TrendingUp,
		title: "Teacher Insight (With Evidence)",
		description: "60% of the class shows confusion between voltage and watts. InzightEd aggregates responses to present a clear, data-backed view of where the class stands — enabling focused academic decisions.",
		accent: "from-yellow-200 via-pink-200 to-rose-200"
	}
];

// helper to create safe ids from titles for deep-linking
const slugify = (s) =>
	String(s)
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9\-]/g, "");

const introAnimation = {
	initial: { opacity: 0, y: 50 },
	whileInView: { opacity: 1, y: 0 },
	viewport: { once: true },
	transition: { duration: 1, ease: 'easeOut' },
};

const containerVariants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1 },
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};



const Features = () => {
	// State for which mobile card is expanded
	const [expandedIndex, setExpandedIndex] = useState(null);

	// precompute slugs for anchorable feature regions
	const featureSlugs = features.map((f) => slugify(f.title));

	// Responsive cursor height for TypewriterEffectSmooth
	// Default to desktop size and adjust on mount / resize for mobile
	const [cursorHeight, setCursorHeight] = useState("2.5rem");

	useEffect(() => {
		const update = () => {
			// Tailwind 'sm' breakpoint is 640px — treat widths below that as mobile
			setCursorHeight(window.innerWidth < 640 ? "2rem" : "2.5rem");
		};
		update();
		window.addEventListener("resize", update);
		return () => window.removeEventListener("resize", update);
	}, []);

	// Inject ItemList JSON-LD describing features for SEO
	useEffect(() => {

		const itemList = {
			"@context": "https://schema.org",
			"@type": "ItemList",
			itemListElement: features.map((f, i) => ({
				"@type": "ListItem",
				position: i + 1,
				item: {
					"@type": "Service",
					name: f.title,
					description: f.description,
					url: window.location.origin + window.location.pathname + `#${slugify(f.title)}`
				}
			}))
		};

		const script = document.createElement('script');
		script.type = 'application/ld+json';
		script.text = JSON.stringify(itemList);
		document.head.appendChild(script);

		return () => script.remove();
	}, []);

	const handleReadMore = (idx) => {
		setExpandedIndex(idx === expandedIndex ? null : idx);
	};

	// no AI-specific card — using general handling for all features

	return (
		<motion.section
			className="pt-20 md:pt-32 bg-white relative overflow-hidden pb-2 sm:pb-8"
			{...introAnimation}
		>
			{/* Grid background */}
			<div
				className={cn(
					"absolute inset-0 z-0",
					"[background-size:40px_40px]",
					"[background-image:linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)]",
				)}
				role="presentation"
				aria-hidden="true"
			/>
			{/* Faded overlays for top and bottom of grid */}
			<div className="pointer-events-none absolute top-0 left-0 w-full h-20 z-10" style={{ background: 'linear-gradient(to bottom, #fff 70%, transparent)' }} role="presentation" aria-hidden="true"></div>
			<div className="pointer-events-none absolute bottom-0 left-0 w-full h-20 z-10" style={{ background: 'linear-gradient(to top, #fff 70%, transparent)' }} role="presentation" aria-hidden="true"></div>
			{/* Radial gradient for faded look */}
			<div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center bg-white [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] " role="presentation" aria-hidden="true"></div>
			{/* Subtle background elements */}
			<div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-blue-100/40 to-transparent rounded-full blur-3xl z-0" role="presentation" aria-hidden="true"></div>
			<div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-r from-indigo-100/40 to-transparent rounded-full blur-3xl z-0" role="presentation" aria-hidden="true"></div>

			<div className="relative z-20 w-full max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-8">
				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 30 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.8, ease: "easeOut" }}
					viewport={{ once: true }}
					className="text-center mb-6 md:mb-14"
				>
					<h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
						What is Inzight<span className="text-blue-500">Ed?</span>
					</h2>
					<p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
						InzightEd is an analytical AI tool for learners and educators. It tells users what exactly to fix and what is likely to go wrong next using historical data.
					</p>
				</motion.div>

				{/* Features Grid - Responsive: flex scroll on mobile/tablet, 4x4 grid on desktop */}
				<motion.div
					variants={containerVariants}
					initial="hidden"
					whileInView="visible"
					viewport={{ once: true }}
					className="flex flex-row overflow-x-auto snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid lg:grid-cols-2 lg:grid-rows-2 gap-4 p-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 mb-24"
				>
					{/* Desktop grid layout for four features only */}

					{/* features[0] - left top */}
					<motion.div
						key={0}
						id={featureSlugs[0]}
						aria-labelledby={`${featureSlugs[0]}-title`}
						variants={itemVariants}
						className="hidden lg:block lg:col-span-1 lg:row-span-1"
					>
						<MagicCard
							gradientSize={220}
							gradientFrom="#38bdf8"
							gradientTo="#818cf8"
							className="group bg-white/70 backdrop-blur-sm rounded-2xl p-8 overflow-hidden h-full flex flex-col justify-center"
						>
							<div className={`absolute inset-0 bg-gradient-to-br ${features[0].accent} opacity-0 pointer-events-none`}></div>
							<div className="relative z-10">
								<div className={`inline-flex items-center justify-center w-16 h-16 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br ${features[0].accent} shadow-lg shadow-slate-900/10 mb-6 group-hover:scale-110 transition-transform duration-300`}>
									{React.createElement(features[0].icon, { className: "w-8 h-8 lg:w-6 lg:h-6 text-white" })}
								</div>
								<h3 id={`${featureSlugs[0]}-title`} className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 leading-snug transition-colors group-hover:text-gray-900">
									Concept Confusion,
									<PointerHighlight
										rectangleClassName="bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-700 leading-loose"
										pointerClassName="text-blue-500 h-3 w-3"
										containerClassName="inline-block ml-1"
									>
										<span className="relative z-10">Clearly Identified</span>
									</PointerHighlight>
								</h3>
								<p className="text-base md:text-lg text-gray-700 leading-relaxed transition-colors">{features[0].description}</p>
							</div>
						</MagicCard>
					</motion.div>

					{/* features[1] - left bottom */}
					<motion.div
						key={1}
						id={featureSlugs[1]}
						aria-labelledby={`${featureSlugs[1]}-title`}
						variants={itemVariants}
						className="hidden lg:block lg:col-span-1 lg:row-span-1"
					>
						<MagicCard
							gradientSize={220}
							gradientFrom="#6ee7b7"
							gradientTo="#67e8f9"
							className="group bg-white/70 backdrop-blur-sm rounded-2xl p-8 overflow-hidden h-full flex flex-col justify-center"
						>
							<div className={`absolute inset-0 bg-gradient-to-br ${features[1].accent} opacity-0 pointer-events-none`}></div>
							<div className="relative z-10">
								<div className={`inline-flex items-center justify-center w-16 h-16 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br ${features[1].accent} shadow-lg shadow-slate-900/10 mb-6 group-hover:scale-110 transition-transform duration-300`}>
									{React.createElement(features[1].icon, { className: "w-8 h-8 lg:w-6 lg:h-6 text-white" })}
								</div>
								<h3 id={`${featureSlugs[1]}-title`} className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 leading-snug transition-colors group-hover:text-gray-900">

									<PointerHighlight
										rectangleClassName="bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700 leading-loose"
										pointerClassName="text-emerald-500 h-3 w-3"
										containerClassName="inline-block ml-1"
									>
										<span className="relative z-10">Hidden Gaps</span>
									</PointerHighlight>
									<span> </span>
									Across Topics
								</h3>
								<p className="text-base md:text-lg text-gray-700 leading-relaxed transition-colors">{features[1].description}</p>
							</div>
						</MagicCard>
					</motion.div>

					{/* features[3] - right top */}
					<motion.div
						key={3}
						id={featureSlugs[3]}
						aria-labelledby={`${featureSlugs[3]}-title`}
						variants={itemVariants}
						className="hidden lg:block lg:col-span-1 lg:row-span-1"
					>
						<MagicCard
							gradientSize={220}
							gradientFrom="#fef08a"
							gradientTo="#fda4af"
							className="group bg-white/70 backdrop-blur-sm rounded-2xl p-8 overflow-hidden h-full flex flex-col justify-center"
						>
							<div className={`absolute inset-0 bg-gradient-to-br ${features[3].accent} opacity-0 pointer-events-none`}></div>
							<div className="relative z-10">
								<div className={`inline-flex items-center justify-center w-16 h-16 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br ${features[3].accent} shadow-lg shadow-slate-900/10 mb-6 group-hover:scale-110 transition-transform duration-300`}>
									{React.createElement(features[3].icon, { className: "w-8 h-8 lg:w-6 lg:h-6 text-white" })}
								</div>
								<h3 id={`${featureSlugs[3]}-title`} className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 leading-snug transition-colors group-hover:text-gray-900">
									<PointerHighlight
										rectangleClassName="bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700 leading-loose"
										pointerClassName="text-yellow-500 h-3 w-3"
										containerClassName="inline-block ml-1"
									>
										<span className="relative z-10">Marks Lost - </span>
									</PointerHighlight>
									<span> </span>
									Explained with Data
								</h3>
								<p className="text-base md:text-lg text-gray-700 leading-relaxed transition-colors">{features[3].description}</p>
							</div>
						</MagicCard>
					</motion.div>


					{/* features[2] - right bottom (Smart Analysis) */}
					<motion.div
						key={2}
						id={featureSlugs[2]}
						aria-labelledby={`${featureSlugs[2]}-title`}
						variants={itemVariants}
						className="hidden lg:block lg:col-span-1 lg:row-span-1"
					>
						<MagicCard
							gradientSize={220}
							gradientFrom="#f0abfc"
							gradientTo="#818cf8"
							className="group bg-white/70 backdrop-blur-sm rounded-2xl p-8 overflow-hidden h-full flex flex-col justify-center"
						>
							<div className={`absolute inset-0 bg-gradient-to-br ${features[2].accent} opacity-0 pointer-events-none`}></div>
							<div className="relative z-10">
								<div className={`inline-flex items-center justify-center w-16 h-16 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br ${features[2].accent} shadow-lg shadow-slate-900/10 mb-6 group-hover:scale-110 transition-transform duration-300`}>
									{React.createElement(features[2].icon, { className: "w-8 h-8 lg:w-6 lg:h-6 text-white" })}
								</div>
								<h3 id={`${featureSlugs[2]}-title`} className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 leading-snug transition-colors group-hover:text-gray-900">
									Class-Wide
									<PointerHighlight
										rectangleClassName="bg-fuchsia-100 dark:bg-fuchsia-900 border-fuchsia-300 dark:border-fuchsia-700 leading-loose"
										pointerClassName="text-fuchsia-500 h-3 w-3"
										containerClassName="inline-block ml-1"
									>
										<span className="relative z-10">Concept Clarity Snapshot</span>
									</PointerHighlight>
								</h3>
								<p className="text-base md:text-lg text-gray-700 leading-relaxed transition-colors">{features[2].description}</p>
							</div>
						</MagicCard>
					</motion.div>

					{/* Mobile layout: AI Chatbot in its own first row, other cards in a separate horizontal second row */}
					<div className="lg:hidden w-full flex flex-col gap-6">
						<motion.div
							variants={containerVariants}
							initial="hidden"
							whileInView="visible"
							viewport={{ once: true }}
							className="flex flex-row overflow-x-auto snap-x snap-mandatory gap-4 px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
						>
							{features.map((feature, index) => {
								const Icon = feature.icon;
								const isExpanded = expandedIndex === index;
								const WORD_LIMIT = 7;
								const words = feature.description.split(" ");
								const shouldTruncate = words.length > WORD_LIMIT;
								const displayText = isExpanded || !shouldTruncate
									? feature.description
									: words.slice(0, WORD_LIMIT).join(" ") + "...";
								return (
									<motion.div
										key={"mobile-" + index}
										id={featureSlugs[index]}
										aria-labelledby={`${featureSlugs[index]}-title`}
										variants={itemVariants}
										className="flex-none snap-start w-72 md:w-80"
									>
										<MagicCard
											gradientSize={220}
											gradientFrom="#3b82f6"
											gradientTo="#a5b4fc"
											className="group bg-white/70 backdrop-blur-sm border border-slate-200/50 rounded-2xl p-6 md:p-8 overflow-hidden h-full"
										>
											<div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 pointer-events-none`}></div>
											<div className="relative z-10">
												<div className={`inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-xl bg-gradient-to-br ${feature.accent} shadow-lg shadow-slate-900/10 mb-6 group-hover:scale-110 transition-transform duration-300`}>
													<Icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
												</div>
												<h3 id={`${featureSlugs[index]}-title`} className="text-xl md:text-2xl font-semibold text-gray-900 mb-4 leading-snug transition-colors group-hover:text-gray-900">{feature.title}</h3>
												<p className="text-base md:text-lg text-gray-700 leading-relaxed transition-colors">
													{displayText}
													{shouldTruncate && (
														<button
															className="ml-2 text-blue-600 underline text-sm focus:outline-none"
															onClick={() => handleReadMore(index)}
														>
															{isExpanded ? "Show less" : "Read more"}
														</button>
													)}
												</p>
											</div>
										</MagicCard>
									</motion.div>
								);
							})}
						</motion.div>
					</div>
				</motion.div>

			</div>
		</motion.section>
	);
};

export default Features;