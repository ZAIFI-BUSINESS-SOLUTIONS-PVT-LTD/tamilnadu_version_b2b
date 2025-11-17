// Centralized per-route meta used by prerender script to inject accurate
// title/description/og:image for landing pages without relying on client-side
// useEffect-based SEO component.
import { faqs } from './components/faq-data.js';

export default {
    '/': {
        title: 'InzightEd — AI-powered NEET mock tests & personalized feedback',
        description: 'Prepare smarter for NEET with AI-evaluated mock tests, instant insights and personalized study plans.',
    image: '/assets/landingpage-images/demo-screenshot.webp',
        organization: {
            name: 'InzightEd',
            url: 'https://inzighted.com',
            logo: '/assets/images/logo.svg',
            sameAs: ['https://www.facebook.com/inzighted', 'https://www.linkedin.com/company/inzighted']
        },
        video: {
            name: 'InzightEd Product Demo',
            description: 'Short demo of InzightEd features',
            thumbnailUrl: '/assets/landingpage-images/demo-thumbnail.webp',
            uploadDate: '2025-01-01',
            duration: 'PT0M57S',
            embedUrl: 'https://www.youtube.com/embed/ipF351hwBgs',
            contentUrl: 'https://youtu.be/ipF351hwBgs'
        }
        ,
        faq: faqs
        ,
        features: [
            { name: 'Full-Length NEET Mock Exam', url: 'https://inzighted.com/#features-full-length-mock' },
            { name: 'Custom Quizzes for Every Topic', url: 'https://inzighted.com/#features-custom-quizzes' },
            { name: 'In-Depth Performance Analytics', url: 'https://inzighted.com/#features-analytics' }
        ],
        howTo: {
            name: 'How to use InzightEd',
            steps: [
                { title: 'Sign Up', text: 'Create your account', url: 'https://inzighted.com/#process-step-sign-up' },
                { title: 'Take a Test/Quiz', text: 'Choose a NEET-style mock test or build your own custom test', url: 'https://inzighted.com/#process-step-take-test' },
                { title: 'Instant AI Feedback', text: 'Receive analytics on strengths, weaknesses, and personalized action steps', url: 'https://inzighted.com/#process-step-feedback' }
            ]
        },
        reviews: {
            ratingValue: 4.6,
            reviewCount: 124,
            sampleReviews: [
                { author: 'Sanjay Kumar', text: 'InzightEd showed me exactly what to focus on for my NEET preparation.' },
                { author: 'Venkatesan N', text: 'The mock tests felt just like the real NEET exam and the instant feedback helped me improve.' }
            ]
        },
    },
    '/pricing': {
        title: 'Pricing — InzightEd',
        description: 'Explore InzightEd pricing plans for AI-powered NEET preparation.',
    },
    '/contact': {
        title: 'Contact — InzightEd',
        description: 'Get in touch with InzightEd for demos, partnerships and support.'
    },
    '/blog': {
        title: 'Blog — InzightEd',
        description: 'Insights, product updates and education research from InzightEd.'
    }
};
