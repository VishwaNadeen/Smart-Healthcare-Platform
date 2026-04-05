export default function AboutPage() {
  const stats = [
    { value: "24/7", label: "Access to healthcare support" },
    { value: "100%", label: "Digital appointment management" },
    { value: "Secure", label: "Protected patient experience" },
    { value: "Fast", label: "Simple online consultation flow" },
  ];

  const features = [
    {
      title: "Online Appointments",
      description:
        "Patients can easily book appointments with doctors through a smooth and convenient digital experience.",
      icon: "📅",
    },
    {
      title: "Telemedicine Consultations",
      description:
        "Secure online consultation sessions allow doctors and patients to connect remotely in real time.",
      icon: "💻",
    },
    {
      title: "Patient-Centered Care",
      description:
        "Our platform is built to improve healthcare accessibility, convenience, and communication for every patient.",
      icon: "❤️",
    },
    {
      title: "Doctor Workflow Support",
      description:
        "Doctors can manage sessions, appointments, and patient interactions efficiently in one unified system.",
      icon: "🩺",
    },
  ];

  const values = [
    {
      title: "Accessibility",
      description:
        "We believe healthcare should be easy to reach for everyone, anytime and anywhere.",
    },
    {
      title: "Trust",
      description:
        "We focus on secure interactions, responsible technology, and reliable healthcare experiences.",
    },
    {
      title: "Innovation",
      description:
        "We use modern digital solutions to improve the way patients and doctors connect.",
    },
    {
      title: "Care",
      description:
        "Every feature is designed to support better patient wellbeing and better medical communication.",
    },
  ];

  return (
    <section className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="overflow-hidden rounded-[32px] bg-gradient-to-br from-blue-600 via-cyan-500 to-sky-400 shadow-xl">
          <div className="grid items-center gap-10 px-6 py-12 sm:px-10 lg:grid-cols-2 lg:px-14 lg:py-16">
            <div className="text-white">
              <span className="inline-flex items-center rounded-full bg-white/15 px-4 py-1 text-sm font-medium backdrop-blur-sm">
                Smart Healthcare Platform
              </span>

              <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
                Transforming Healthcare Through Digital Innovation
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-blue-50 sm:text-base">
                Smart Healthcare is a modern healthcare management platform
                designed to make medical services more accessible, efficient,
                and connected. We help patients book appointments, join
                telemedicine consultations, and experience healthcare in a more
                convenient and secure way.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                  Doctor Appointments
                </span>
                <span className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                  Telemedicine
                </span>
                <span className="rounded-xl bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm">
                  Patient Management
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl bg-white/15 p-5 text-white shadow-lg backdrop-blur-md"
                >
                  <h3 className="text-2xl font-bold sm:text-3xl">
                    {item.value}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-blue-50">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mission */}
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">Our Mission</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              Our mission is to bridge the gap between patients and healthcare
              providers by creating a digital platform that is simple, secure,
              and effective. We aim to improve access to healthcare services
              through online appointment booking, virtual consultations, and
              streamlined healthcare management.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <h2 className="text-2xl font-bold text-slate-900">Our Vision</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
              We envision a future where healthcare is more connected,
              patient-friendly, and technology-driven. Smart Healthcare is built
              to support that future by making healthcare services easier to
              manage for both patients and doctors.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-10">
          <div className="mb-6 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              What We Offer
            </h2>
            <p className="mt-3 text-sm text-slate-600 sm:text-base">
              Powerful healthcare features designed for both patients and
              medical professionals.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
                  {feature.icon}
                </div>

                <h3 className="mt-5 text-xl font-semibold text-slate-900">
                  {feature.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Why choose us */}
        <div className="mt-10 rounded-[32px] bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">
                Why Choose Smart Healthcare?
              </h2>
              <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
                Smart Healthcare combines convenience, security, and modern user
                experience to provide a better healthcare journey for everyone.
                Whether booking an appointment or attending an online
                consultation, our platform is built to simplify the entire
                process.
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Easy Appointment Booking
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Patients can request and manage appointments quickly without
                    unnecessary complexity.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Remote Consultation Support
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Doctors and patients can connect online through telemedicine
                    sessions in a seamless way.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="font-semibold text-slate-900">
                    Modern and Scalable Platform
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Built with modern technologies to support future healthcare
                    innovation and system growth.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="rounded-3xl bg-gradient-to-br from-slate-50 to-blue-50 p-5 ring-1 ring-slate-200"
                >
                  <h3 className="text-lg font-semibold text-slate-900">
                    {value.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Closing section */}
        <div className="mt-10 rounded-[32px] bg-slate-900 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Building Smarter Healthcare Experiences
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
            Smart Healthcare is more than a digital platform. It is a step
            toward more accessible, connected, and patient-focused healthcare.
            Our goal is to empower both patients and healthcare professionals
            with tools that make healthcare simpler and more effective.
          </p>
        </div>
      </div>
    </section>
  );
}