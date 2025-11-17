import React from 'react';
import BlogPage from './blogpage';
import BlogImage8 from '../../../../assets/landingpage-images/blog/blog8.webp';
import DEMO_SCREEN from '../../../../assets/landingpage-images/demo-screenshot.webp';

export const meta = {
	title: 'Best NEET Study Plan – 30, 60 & 90-Day Revision Roadmaps',
	date: '2025-09-04',
	excerpt: 'Get the best NEET study plan for 30, 60, and 90 days. Includes daily/weekly schedules, mock test integration, and AI-personalized learning paths.',
	description: 'Discover the best NEET study plans for 30, 60, and 90 days. Includes daily and weekly schedules, integration with mock tests, and AI-personalized learning paths for top results.',
	slug: 'neet-study-plan-roadmaps',
	tags: ['NEET', 'Study Plan', 'Mock Test', 'AI Insights'],
	author: 'InzightEd',
	image: BlogImage8,
	canonical: `https://inzighted.com/blog/neet-study-plan-roadmaps`,
	ogType: 'article'
};

export default function Blog8() {
	return (
		<BlogPage meta={meta}>
			<div className="prose prose-lg max-w-none mb-12">
				<h1 className="mb-4">Best NEET Study Plan – 30, 60 & 90-Day Revision Roadmaps</h1>
				<p>
					Need a smart <strong>NEET study plan</strong>? Whether you have 30, 60, or 90 days left, these roadmaps help you revise efficiently, integrate mock tests, and use AI-personalized learning paths for your best score.
				</p>

				<h2 className="mt-8">30-Day NEET Study Plan</h2>
				<ul>
					<li>Focus on high-weightage topics and quick revision</li>
					<li>Daily mock tests and error analysis</li>
					<li>Short, focused study blocks (2–3 hours each)</li>
					<li>Weekly full syllabus review</li>
				</ul>

				<h2 className="mt-8">60-Day NEET Study Plan</h2>
				<ul>
					<li>Divide syllabus into 8 weekly segments</li>
					<li>Alternate theory and practice days</li>
					<li>Mock tests every 3 days, with AI feedback</li>
					<li>Weekly revision and error log updates</li>
				</ul>

				<h2 className="mt-8">90-Day NEET Study Plan</h2>
				<ul>
					<li>Cover all topics in first 60 days, revise in last 30</li>
					<li>Daily study schedule: 1 major topic + 1 minor topic</li>
					<li>Mock tests every week, increasing frequency in last month</li>
					<li>Use AI-personalized learning path to adapt focus</li>
				</ul>

				<h2 className="mt-8">Sample Weekly Schedule</h2>
				<table className="table-auto border mb-6">
					<thead>
						<tr>
							<th className="px-4 py-2 border">Day</th>
							<th className="px-4 py-2 border">Focus</th>
							<th className="px-4 py-2 border">Tasks</th>
						</tr>
					</thead>
					<tbody>
						<tr><td className="border px-4 py-2">Monday</td><td className="border px-4 py-2">Biology</td><td className="border px-4 py-2">Theory + MCQs</td></tr>
						<tr><td className="border px-4 py-2">Tuesday</td><td className="border px-4 py-2">Physics</td><td className="border px-4 py-2">Concepts + Practice</td></tr>
						<tr><td className="border px-4 py-2">Wednesday</td><td className="border px-4 py-2">Chemistry</td><td className="border px-4 py-2">Organic + Revision</td></tr>
						<tr><td className="border px-4 py-2">Thursday</td><td className="border px-4 py-2">Biology</td><td className="border px-4 py-2">Mock Test + Analysis</td></tr>
						<tr><td className="border px-4 py-2">Friday</td><td className="border px-4 py-2">Physics</td><td className="border px-4 py-2">Numericals + Error Log</td></tr>
						<tr><td className="border px-4 py-2">Saturday</td><td className="border px-4 py-2">Chemistry</td><td className="border px-4 py-2">Physical + MCQs</td></tr>
						<tr><td className="border px-4 py-2">Sunday</td><td className="border px-4 py-2">Revision</td><td className="border px-4 py-2">Full Syllabus Review</td></tr>
					</tbody>
				</table>

				<h2 className="mt-8">Integrate Mock Tests & AI Learning Paths</h2>
				<ul>
					<li>Take regular mock tests (<a href="https://inzighted.com/mock-test" target="_blank" rel="noopener" className="underline text-blue-600">free NEET mock test</a>)</li>
					<li>Use AI feedback to adapt your study plan</li>
					<li>Track your strengths and weaknesses for targeted revision</li>
				</ul>
				<div className="my-6">
					<img src={DEMO_SCREEN} alt="InzightEd AI Learning Path Demo Screenshot" className="rounded shadow-lg mb-4" loading="lazy" />
				</div>

				<h2 className="mt-8">Student Tip</h2>
				<p>
					Choose the plan that fits your timeline. Stay consistent, use AI insights, and adjust your strategy as you progress.
				</p>

				<h2 className="mt-8">Final Thoughts</h2>
				<p>
					The best NEET study plan is one you follow every day. Use these roadmaps, integrate mock tests, and let AI guide your learning for top results!
				</p>
			</div>
		</BlogPage>
	);
}

