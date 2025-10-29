import React from 'react';
import { LineChart, Brain, BookOpenText, Upload } from 'lucide-react';

const features = [
	{
		title: 'Track Learning Over Time',
		description: 'Quickly see how a student improves—or repeats the same mistakes—across tests.',
		icon: <LineChart size={32} className="text-gray-700" />, // Better for tracking progress over time
	},
	{
		title: 'Hyper-Personalized Insights',
		description: 'Each student gets insights built around how they learn and where they struggle.',
		icon: <Brain size={32} className="text-gray-700" />, // Represents personalized learning and insights
	},
	{
		title: 'Precise Insights at Subtopic Level',
		description: 'We go beyond just scores—our AI analyzes mistakes by concept, question type, and subtopic.',
		icon: <BookOpenText size={32} className="text-gray-700" />, // Represents detailed topic analysis
	},
	{
		title: 'Pen-Paper Test Uploads (Offline Exams)',
		description: 'Just drag and drop three files—question paper, answer key, and response sheet. The AI handles the rest',
		icon: <Upload size={32} className="text-gray-700" />, // Clearly represents file uploads
	}
];

const FeatureCard = ({ feature }) => (
	<div
		className={`group card rounded-2xl overflow-hidden bg-white border border-blue-200 flex flex-col items-center justify-start text-center`}
		data-aos="fade-up"
	>
		<div className="p-6 relative z-10">
			<div className="flex flex-col items-center mb-4">
				<div className="p-3 rounded-xl mb-2">
					{React.cloneElement(feature.icon)}
				</div>
				<h3 className="text-xl font-semibold">
					{feature.title}
				</h3>
			</div>
			<p className="text-gray-600 leading-relaxed">{feature.description}</p>
		</div>
	</div>
);

const KeyFeatures = () => {
	return (
		<section
			className="py-24 relative overflow-hidden bg-blue-50"
			aria-label="Data Privacy Features"
			id="features"
		>
			{/* Content container with uniform width */}
			<div className="relative z-10 w-full max-w-screen-xl mx-auto px-4 sm:px-8 md:px-16 text-gray-700 text-left">
				<div className="mb-16 text-left">

					<h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
						We Don't Just Handle Data.{' '}
						<span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-600 to-blue-400">
							<br />We Respect them
						</span>
					</h2>
					<p className="text-gray-600 text-xl leading-relaxed">
						Our commitment to data privacy and institutional control ensures your educational data remains secure and accessible only to you.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-4 gap-8">
					{features.map((feature, index) => (
						<FeatureCard key={index} feature={feature} />
					))}
				</div>
			</div>
		</section>
	);
};

export default KeyFeatures;