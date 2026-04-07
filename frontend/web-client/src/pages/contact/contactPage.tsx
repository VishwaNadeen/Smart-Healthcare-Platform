import { Mail, MapPin, Phone, Clock } from "lucide-react";

export default function ContactPage() {
  const contactDetails = [
    {
      title: "Email Support",
      value: "support@smarthealthcare.com",
      description: "Reach out to us for platform support and general inquiries.",
      icon: Mail,
    },
    {
      title: "Phone",
      value: "+94 77 123 4567",
      description: "Talk to our support team during working hours.",
      icon: Phone,
    },
    {
      title: "Location",
      value: "Colombo, Sri Lanka",
      description: "Serving patients and healthcare professionals digitally.",
      icon: MapPin,
    },
    {
      title: "Working Hours",
      value: "Mon - Fri, 8:00 AM - 6:00 PM",
      description: "Our team is available during standard support hours.",
      icon: Clock,
    },
  ];

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 via-cyan-500 to-sky-400 shadow-xl">
          <div className="grid gap-10 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:px-14 lg:py-16">
            <div className="text-white">
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1 text-sm font-medium backdrop-blur-sm">
                Contact Smart Healthcare
              </span>

              <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                We’re Here to Help You
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-50 sm:text-base">
                Have questions about appointments, consultations, or platform
                access? Our team is here to support patients and healthcare
                professionals with fast, friendly, and reliable assistance.
              </p>

              <div className="mt-8 space-y-4">
                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                  <h3 className="font-semibold">Quick Support</h3>
                  <p className="mt-1 text-sm text-blue-50">
                    Contact us for account help, appointment issues, and general
                    platform assistance.
                  </p>
                </div>

                <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm">
                  <h3 className="font-semibold">Healthcare Assistance</h3>
                  <p className="mt-1 text-sm text-blue-50">
                    We help make digital healthcare easier for both patients and
                    doctors.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-2xl font-bold text-slate-900">
                Send Us a Message
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Fill out the form below and our team will get back to you soon.
              </p>

              <form className="mt-6 space-y-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter first name"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter last name"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Subject
                  </label>
                  <input
                    type="text"
                    placeholder="Enter subject"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Write your message here..."
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Get in Touch
            </h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Reach us through the following channels for support and guidance.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {contactDetails.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Icon className="h-7 w-7" />
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-slate-900">
                    {item.title}
                  </h3>

                  <p className="mt-2 text-sm font-medium text-blue-600">
                    {item.value}
                  </p>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-10 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Why Contact Smart Healthcare?
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                Whether you need help with doctor appointments, telemedicine
                sessions, or your account, we’re committed to giving you the
                support you need. Our goal is to make healthcare simpler,
                smoother, and more accessible through digital technology.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">
                  Appointment Help
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Assistance with creating, managing, and tracking appointments.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">
                  Telemedicine Support
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Guidance for joining and using online consultation sessions.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">
                  Technical Assistance
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Help with platform access, login issues, and system usage.
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="font-semibold text-slate-900">
                  General Inquiries
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  Reach out with questions, feedback, or partnership interests.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
