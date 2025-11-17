import React, { useState, useMemo, useEffect } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../../components/ui/accordion.jsx';
import { faqs } from './faq-data.js';

// helper to create safe ids for deep-linking
const slugify = (s) =>
	String(s)
		.toLowerCase()
		.trim()
		.replace(/\s+/g, "-")
		.replace(/[^a-z0-9\-]/g, "");

// Produce a one-sentence canonical answer suitable for JSON-LD / AI retrieval.
// Rules: return the first complete sentence from the answer text. If the
// answer is already one sentence, return it. If there are no sentence
// delimiters, return the first 140 characters trimmed and appended with ellipses.
const canonicalOneSentence = (text) => {
	if (!text || typeof text !== 'string') return '';
	// Normalize whitespace
	const normalized = text.replace(/\s+/g, ' ').trim();
	// Attempt to split on sentence terminators followed by space and capital letter
	const sentenceMatch = normalized.match(/.*?[\.\?!](?:\s|$)/);
	if (sentenceMatch && sentenceMatch[0].trim().length <= 280) {
		return sentenceMatch[0].trim();
	}
	// Fallback: take up to first period-less chunk or truncate
	const firstPeriodIndex = normalized.indexOf('.');
	if (firstPeriodIndex > -1) return normalized.slice(0, firstPeriodIndex + 1).trim();
	if (normalized.length <= 140) return normalized;
	return normalized.slice(0, 137).trim() + '...';
};

const FAQ = () => {
	const [openIndex, setOpenIndex] = useState(null);
	const itemsPerPage = 4;
	const totalPages = Math.ceil(faqs.length / itemsPerPage);
	const [currentPage, setCurrentPage] = useState(1);

	const displayedFaqs = useMemo(
		() => faqs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
		[currentPage]
	);

	// Build minimal FAQPage schema and inject defensively
	useEffect(() => {
		if (!displayedFaqs || displayedFaqs.length === 0) return;
		const buildFAQSchema = (items) => ({
			"@context": "https://schema.org",
			"@type": "FAQPage",
			mainEntity: items.map((f) => ({
				"@type": "Question",
				name: f.question,
				acceptedAnswer: { "@type": "Answer", text: canonicalOneSentence(f.answer) }
			}))
		});

		const script = document.createElement('script');
		script.type = 'application/ld+json';
		script.text = JSON.stringify(buildFAQSchema(displayedFaqs));
		document.head.appendChild(script);

		return () => script.remove();
	}, [displayedFaqs]);

	return (
		<section
			id="faq"
			aria-labelledby="faq-heading"
			className="bg-blue-50 pt-28 pb-20 text-gray-700 relative overflow-hidden"
		>
			<div className="relative z-10 w-full max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-8">
				<div className="text-center mb-16">
					<h2 id="faq-heading" className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-4 leading-tight">
						Frequently Asked <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">Questions</span>
					</h2>
					<p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
						Answers to common questions about how InzightEd works, integrations, and support.
					</p>
				</div>

				<Accordion
					type="single"
					collapsible
					value={openIndex !== null ? String(openIndex) : ''}
					onValueChange={(val) => setOpenIndex(val === '' ? null : Number(val))}
					className="space-y-2"
				>
					{displayedFaqs.map((faq, idx) => {
						const absoluteIndex = (currentPage - 1) * itemsPerPage + idx;
						const qSlug = slugify(faq.question || String(absoluteIndex));
						const questionId = `faq-q-${qSlug}`;
						const panelId = `faq-panel-${qSlug}`;
						return (
							<AccordionItem
								key={`${absoluteIndex}-${qSlug}`}
								value={String(absoluteIndex)}
								className="bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-200"
							>
								<AccordionTrigger aria-controls={panelId} aria-labelledby={questionId} className="w-full text-left px-6 py-4 flex justify-between items-center rounded-xl transition-colors duration-150 hover:bg-gray-50">
									<span id={questionId} className="flex-1 text-base md:text-xl font-semibold text-gray-900">
										{faq.question}
									</span>
								</AccordionTrigger>
								<AccordionContent id={panelId} role="region" aria-labelledby={questionId} className="px-6 pb-4 pt-0">
									<p className="text-base md:text-lg text-gray-700 leading-relaxed mb-0">
										{faq.answer}
									</p>
								</AccordionContent>
							</AccordionItem>
						);
					})}
				</Accordion>

				{totalPages > 1 && (
					<nav aria-label="FAQ pages" className="flex justify-center mt-8">
						<div className="join">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
								<button
									key={page}
									onClick={() => setCurrentPage(page)}
									aria-current={page === currentPage ? 'true' : undefined}
									aria-label={`Go to page ${page} of ${totalPages}`}
									className={`join-item btn btn-sm ${page === currentPage ? 'btn-secondary' : 'btn-ghost'}`}
								>
									{page}
								</button>
							))}
						</div>
					</nav>
				)}
			</div>
		</section>
	);
};

export default FAQ;