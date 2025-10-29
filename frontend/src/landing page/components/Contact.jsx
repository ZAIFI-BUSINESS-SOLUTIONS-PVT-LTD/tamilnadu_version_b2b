import React from "react";
import { Phone, Mail, MapPin, Send } from "lucide-react";
import { LinkedinLogo } from "@phosphor-icons/react";

const contactInfo = [
	{
		icon: <Phone className="w-5 h-5" />,
		label: "Phone",
		value: "+91 63859-21669",
		href: "tel:+916385921669",
	},
	{
		icon: <Mail className="w-5 h-5" />,
		label: "Email",
		value: "contact@zai-fi.com",
		href: "mailto:contact@zai-fi.com",
	},
	{
		icon: <MapPin className="w-5 h-5" />,
		label: "Location",
		value: "Nehru Group of Institutions Technology Business Incubator (NGI TBI), Nehru Gardens, Thirumalayampalayam, Coimbatore, Tamil Nadu - 641 105",
		href: "https://www.google.com/maps/place/NGI+Technology+Business+Incubator/",
	},
];

const socials = [
	{
		icon: <LinkedinLogo size={20} weight="fill" />,
		href: "https://www.linkedin.com/company/zai-fi/?viewAsMember=true",
		label: "LinkedIn",
	},
];

const ContactUs = () => {
	return (
		<div className="bg-blue-50 pt-28 pb-20 px-4 sm:px-6 lg:px-8 text-gray-700">
			{/* Main container with max-width matching header */}
			<div className="max-w-7xl mx-auto">
				{/* Page header */}
				<div className="text-center mb-16">
					<h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight tracking-tight">
						Contact{" "}
						<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">
							Us
						</span>
					</h2>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto">
						Having questions or want to learn more? Reach out to our team.
					</p>
				</div>

				{/* Content grid */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Contact information card */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 lg:p-10">
						<h2 className="text-2xl font-bold text-gray-700 mb-6">
							Get in touch
						</h2>

						<ul className="space-y-6 mb-10">
							{contactInfo.map((item, i) => (
								<li key={i} className="flex items-start gap-4">
									<span className="bg-blue-50 p-3 rounded-lg text-blue-600">
										{item.icon}
									</span>
									<div>
										<span className="block text-sm font-medium text-gray-500 mb-1">
											{item.label}
										</span>
										<a
											href={item.href}
											className="text-gray-700 hover:text-blue-600 font-medium transition-colors"
										>
											{item.value}
										</a>
									</div>
								</li>
							))}
						</ul>

						<div>
							<h3 className="text-sm font-medium text-gray-500 mb-4">
								FOLLOW US
							</h3>
							<div className="flex gap-3">
								{socials.map((s, i) => (
									<a
										key={i}
										href={s.href}
										className="bg-gray-100 hover:bg-gray-200 rounded-lg p-3 text-gray-700 transition-all"
										aria-label={s.label}
									>
										{s.icon}
									</a>
								))}
							</div>
						</div>
					</div>

					{/* Contact form card */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 lg:p-10">
						<h2 className="text-2xl font-bold text-gray-700 mb-6">
							Send us a message
						</h2>

						<form
							className="space-y-6"
							action="https://formsubmit.co/contact@zai-fi.com"
							method="POST"
						>
							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Your name
								</label>
								<input
									id="name"
									name="name"
									type="text"
									required
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
									placeholder="John Doe"
								/>
							</div>

							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Email address
								</label>
								<input
									id="email"
									name="email"
									type="email"
									required
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
									placeholder="you@example.com"
								/>
							</div>

							<div>
								<label
									htmlFor="message"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Message
								</label>
								<textarea
									id="message"
									name="message"
									rows="4"
									required
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
									placeholder="How can we help you?"
								></textarea>
							</div>

							<div>
								<button
									type="submit"
									className="w-full py-3 px-6 font-medium rounded-lg text-white bg-gradient-to-br from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
								>
									<Send className="w-5 h-5" />
									Send message
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ContactUs;