import React, { useState, useMemo } from 'react';
import { CaretDown } from '@phosphor-icons/react';

const faqs = [
	{
		question: 'What makes InzightEd different from traditional evaluation systems?',
		answer:
			'Unlike traditional systems that just focus on scores, InzightEd provides actionable insights. We go beyond numbers to offer a deep, meaningful understanding of student performance. Our platform uses advanced analytics to pinpoint exactly where students need help, turning assessment into a powerful learning tool.',
	},
	{
		question: 'How does InzightEd help students improve?',
		answer:
			'We\'re your personal academic success partner! Our platform creates personalized study plans tailored to your unique learning needs. By identifying knowledge gaps early, we help you develop targeted revision strategies. It\'s like having a 24/7 tutor that understands exactly how you learn best.',
	},
	{
		question: 'What results can educational institutions expect?',
		answer:
			'Impressive ones! Institutions using InzightEd typically see a 20% boost in student performance. We help improve student engagement, increase success rates, and enhance the overall academic reputation—all while seamlessly integrating with existing systems.',
	},
	{
		question: 'How accurate is InzightEd\'s grading?',
		answer:
			'Completely unbiased and precise. Our AI-driven grading system eliminates human error and subjective scoring. You get 100% fair, consistent evaluations that focus on your actual understanding, not random variations in grading.',
	},
	{
		question: 'Can InzightEd work with our current systems?',
		answer:
			'Absolutely! We designed InzightEd to play nicely with all major Learning Management Systems. Smooth integration means no disruption to your existing workflows—just enhanced learning insights.',
	},
	{
		question: 'How does the AI Chatbot actually help students?',
		answer:
			'Think of our AI Chatbot as your personal academic coach. Available 24/7, it provides instant, personalized guidance. Need help preparing for an exam? Struggling with a concept? The chatbot offers tailored advice, study strategies, and performance predictions.',
	},
	{
		question: 'Is my data safe with InzightEd?',
		answer:
			'Data security is our top priority. We use enterprise-grade encryption and strict access controls to protect all information. Your academic data is locked down with the same level of security used by major financial institutions.',
	},
	{
		question: 'What types of assessments can InzightEd handle?',
		answer:
			'We specialize in multiple-choice questions and structured assessments. Our AI provides instant, detailed evaluations that go far beyond simple right or wrong scoring. You\'ll get comprehensive insights into your learning progress.',
	},
	{
		question: 'How can I get started with InzightEd?',
		answer:
			'It\'s super easy! Just reach out to our team for a personalized demo. We\'ll walk you through the platform, show you its capabilities, and help you understand how InzightEd can transform your learning experience.',
	},
	{
		question: 'Do you offer support for new users?',
		answer:
			'100% yes! We provide comprehensive onboarding, hands-on training, and dedicated local support. We\'re committed to making your transition to InzightEd smooth and stress-free.',
	},
	{
		question: 'How does InzightEd help with learning across different subjects?',
		answer:
			'Our cross-subject analysis is like having an academic detective. Struggling with Physics? We\'ll dig deeper to see if the root cause might be gaps in Math skills. This means more targeted support and a holistic approach to your learning.',
	},
];

const FAQ = () => {
	const [openIndex, setOpenIndex] = useState(null);
	const itemsPerPage = 4;
	const totalPages = Math.ceil(faqs.length / itemsPerPage);
	const [currentPage, setCurrentPage] = useState(1);

	const displayedFaqs = useMemo(
		() => faqs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
		[currentPage]
	);

	const toggleIndex = (index) => {
		setOpenIndex((prev) => (prev === index ? null : index));
	};

	return (
		<section
			id="faq"
			aria-label="Frequently Asked Questions"
			className="bg-blue-50 pt-28 pb-20 px-4 sm:px-6 lg:px-8 text-gray-700 relative overflow-hidden min-h-[70vh]"
		>
			<div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-16">
					<h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight tracking-tight">
						Frequently Asked{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
							Questions
						</span>
					</h2>
				</div>

				<div className="space-y-4">
					{displayedFaqs.map((faq, idx) => (
						<div
							key={faq.question}
							className="bg-white border border-gray-200 rounded-xl shadow-sm transition-all duration-200"
						>
							<button
								aria-expanded={openIndex === idx}
								onClick={() => toggleIndex(idx)}
								className="w-full text-left px-6 py-4 flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-200 rounded-xl transition-colors duration-150 hover:bg-gray-50"
							>
								<span className="flex-1 text-base md:text-lg font-medium text-gray-700">
									{faq.question}
								</span>
								<CaretDown
									weight="bold"
									className={`w-6 h-6 ml-2 shrink-0 transition-transform duration-200 ${openIndex === idx ? 'rotate-180 text-blue-500' : 'text-gray-400'}`}
								/>
							</button>

							<div
								className={`overflow-hidden transition-all duration-300 ${openIndex === idx ? 'max-h-40 opacity-100 py-3 px-6' : 'max-h-0 opacity-0 py-0 px-6'}`}
							>
								<p className="text-gray-700 text-base leading-relaxed">
									{faq.answer}
								</p>
							</div>
						</div>
					))}
				</div>

				{totalPages > 1 && (
					<div className="flex justify-center mt-8">
						<div className="inline-flex gap-1 rounded-lg bg-white shadow p-1">
							{Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
								<button
									key={page}
									onClick={() => setCurrentPage(page)}
									className={`w-8 h-8 rounded-md font-medium text-sm transition-all duration-150 ${page === currentPage ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-blue-100'}`}
								>
									{page}
								</button>
							))}
						</div>
					</div>
				)}
			</div>
		</section>
	);
};

export default FAQ;