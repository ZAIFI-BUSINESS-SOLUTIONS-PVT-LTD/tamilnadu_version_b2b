
import React from 'react';
import SEO from '../../SEO';

// A small, SEO-friendly canonical tag list (limit to 8-10 tags)
const ALLOWED_TAGS = [
	'NEET',
	'Mock Test',
	'AI Insights',
	'Exam Strategy',
	'Error Analysis',
	'Time Management',
	'Rank Predictor',
	'Syllabus',
	'Study Plan',
	'Previous Papers'
];

export default function BlogPage({ meta, children }) {
	// Ensure only allowed tags are passed to SEO and UI, and limit to 3-4 tags per page
	const pageTags = (meta.tags || []).filter(t => ALLOWED_TAGS.includes(t)).slice(0, 4);

	return (
		<article>
			<SEO
				title={meta.title}
				description={meta.description || meta.excerpt}
				url={meta.canonical || `/blog/${meta.slug}`}
				image={meta.image}
				date={meta.date}
				author={meta.author}
				tags={pageTags}
			/>

			{/* Cover image with aspect ratio and gradient overlay */}
			<div className="relative">
				<div className="aspect-[3/2] md:aspect-[16/4] w-full relative overflow-hidden z-0">
					<img
						src={meta.image}
						alt={meta.title}
						className="object-cover w-full h-full block"
					/>
				</div>

				{/* Gradient fade overlaps bottom of image and top of content */}
				<div className="w-full h-20 md:h-48 -mt-12 md:-mt-24 bg-gradient-to-b from-transparent to-white/90 z-20 relative" />

				{/* Content container overlapping the image */}
				<div className="max-w-4xl mx-auto md:-mt-16 relative z-20 px-4 sm:px-6 lg:px-8 pb-12 md:pb-20">
					{/* Category / Badge */}
					<span className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-sm font-medium text-gray-800 mb-4">
						{pageTags && pageTags.length ? pageTags[0] : 'Article'}
					</span>

					{/* Title */}
					<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-gray-900 relative z-30">{meta.title}</h1>

					{/* Meta row */}
					<div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-8">
						<div className="font-medium text-gray-900">{meta.author}</div>
						<div className="flex items-center gap-1">
							<span className="text-gray-400">📅</span>
							<time dateTime={meta.date}>{new Date(meta.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time>
						</div>
						<div>5 min read</div>
					</div>

					{/* Article body injected by child blog files */}
					{children}

					{/* CTA / Continue reading (shared) */}
					<div className="border-t pt-8 mt-8">
						<h3 className="font-bold text-xl mb-4">Continue Reading</h3>
						<div className="flex flex-col md:flex-row gap-4">
							<a href="/blog" className="inline-block px-4 py-2 border rounded-md text-sm text-gray-700 hover:bg-gray-50">More Articles</a>
							<a href="/about" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">Learn About Our AI Platform</a>
						</div>
					</div>
				</div>
			</div>
		</article>
	);
}
