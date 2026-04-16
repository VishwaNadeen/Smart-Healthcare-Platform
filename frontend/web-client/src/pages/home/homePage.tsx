import { Link } from "react-router-dom";
import { getStoredTelemedicineAuth } from "../../utils/telemedicineAuth";
import HomeHeroSliderBackground from "../../components/home/HomeImageSlider";

const animationStyles = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-10px); }
  }
  @keyframes pulseFade {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50%       { opacity: 0.6; transform: scale(1.08); }
  }
  @keyframes cardReveal {
    from { opacity: 0; transform: translateY(32px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes borderPulse {
    0%, 100% { border-color: rgba(147, 197, 253, 0.45); }
    50%       { border-color: rgba(59, 130, 246, 0.95); }
  }

  .animate-fadeIn h1          { animation: fadeSlideUp 0.6s ease both 0.1s; }
  .animate-fadeIn p           { animation: fadeSlideUp 0.6s ease both 0.28s; }
  .animate-fadeIn .btn-group  { animation: fadeSlideUp 0.6s ease both 0.44s; }

  .animate-blob { animation: pulseFade 5s ease-in-out infinite; }

  .animate-float-card { animation: float 4s ease-in-out infinite; }

  .service-card:nth-child(1) { animation: cardReveal 0.5s ease both 0.1s; }
  .service-card:nth-child(2) { animation: cardReveal 0.5s ease both 0.24s; }
  .service-card:nth-child(3) { animation: cardReveal 0.5s ease both 0.38s; }

  .animate-cta { animation: fadeSlideUp 0.6s ease both 0.1s; }
`;

export default function HomePage() {
  const auth = getStoredTelemedicineAuth();

  return (
    <>
      <style>{animationStyles}</style>

      <div className="w-full">
        {/* Hero Section */}
        <section className="relative min-h-[420px] overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100 md:min-h-[520px] lg:min-h-[600px]">
          {/* Background Slider */}
          <HomeHeroSliderBackground />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/45 z-[1]" />

          {/* Content */}
          <div className="relative z-[2] mx-auto grid min-h-[420px] max-w-7xl gap-10 px-6 py-16 md:min-h-[520px] md:grid-cols-2 md:items-center lg:min-h-[600px] lg:py-24">
            {/* Left Side */}
            <div className="animate-fadeIn">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight">
                Smart Healthcare <br />
                <span className="text-blue-300">Anytime, Anywhere</span>
              </h1>

              <p className="mt-6 text-gray-200 text-lg">
                Book doctor appointments, consult online, and manage your
                healthcare easily with our smart healthcare platform.
              </p>

              <div className="btn-group mt-8 flex gap-4 flex-wrap">
                <Link
                  to="/appointments"
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:bg-blue-700 hover:-translate-y-1 transition-all duration-300"
                >
                  Book Appointment
                </Link>

                <Link
                  to="/doctors"
                  className="border border-white/40 text-white px-6 py-3 rounded-xl hover:bg-white/10 transition-all duration-300"
                >
                  Find Doctors
                </Link>
              </div>
            </div>

            {/* Right Side — floating card */}
            <div className="flex justify-center items-center relative">
              {/* Blob */}
              <div className="animate-blob w-72 h-72 bg-blue-400 rounded-full blur-3xl opacity-20 absolute" />

              {/* Floating consultation card */}
              <Link
                to="/consultation"
                className="animate-float-card block w-80 rounded-2xl px-6 pt-5 pb-6 transition hover:-translate-y-1"
              >
                  <h3 className="mb-2 text-[28px] font-bold leading-snug text-white">
                    Online Consultation
                  </h3>

                  <p className="text-[15px] leading-7 text-white/85">
                    Connect with doctors through secure video consultation.
                  </p>

                  {/* Status badge */}
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                      <svg
                        className="h-5 w-5 text-blue-600"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10l4.553-2.069A1 1 0 0121 8.82V15a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                        />
                      </svg>
                    </div>

                    <div className="inline-flex items-center gap-2 px-1 py-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs font-medium text-white">
                        Doctors available now
                      </span>
                    </div>
                  </div>
              </Link>
            </div>
          </div>
        </section>

        {/* Our Services */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-center text-slate-800 mb-10">
            Our Services
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="service-card bg-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-t-4 border-blue-500">
              <h3 className="text-xl font-semibold text-blue-600 mb-2">
                Doctor Appointments
              </h3>
              <p className="text-gray-600 text-sm">
                Easily book and manage doctor appointments online.
              </p>
            </div>

            <div className="service-card bg-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-t-4 border-blue-500">
              <h3 className="text-xl font-semibold text-blue-600 mb-2">
                Video Consultation
              </h3>
              <p className="text-gray-600 text-sm">
                Meet doctors online via secure video consultation.
              </p>
            </div>

            <div className="service-card bg-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border-t-4 border-blue-500">
              <h3 className="text-xl font-semibold text-blue-600 mb-2">
                Medical Records
              </h3>
              <p className="text-gray-600 text-sm">
                Store and manage your medical records safely.
              </p>
            </div>
          </div>
        </section>

        {/* CTA */}
        {!auth.isAuthenticated && (
          <section className="bg-blue-600 text-white py-16 text-center animate-cta">
            <h2 className="text-3xl font-bold mb-4">
              Start Your Online Consultation Today
            </h2>
            <p className="mb-6 text-blue-100">
              Join Smart Healthcare and connect with professional doctors.
            </p>

            <Link
              to="/signup"
              className="bg-white text-blue-600 px-8 py-3 rounded-xl font-semibold hover:bg-gray-100 transition"
            >
              Create Account
            </Link>
          </section>
        )}
      </div>
    </>
  );
}
