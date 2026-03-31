import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-10 items-center">
          
          <div className="animate-fadeIn">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight">
              Smart Healthcare <br />
              <span className="text-blue-600">
                Anytime, Anywhere
              </span>
            </h1>

            <p className="mt-6 text-gray-600 text-lg">
              Book doctor appointments, consult online, and manage your
              healthcare easily with our smart healthcare platform.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                to="/appointments"
                className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-md hover:bg-blue-700 hover:-translate-y-1 transition-all duration-300"
              >
                Book Appointment
              </Link>

              <Link
                to="/doctors"
                className="border border-blue-200 text-blue-700 px-6 py-3 rounded-xl hover:bg-blue-50 transition-all duration-300"
              >
                Find Doctors
              </Link>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex justify-center">
            <div className="w-72 h-72 bg-blue-200 rounded-full blur-3xl opacity-40 absolute"></div>
            <div className="relative bg-white shadow-xl rounded-2xl p-6 w-80 animate-float">
              <h3 className="font-semibold text-lg mb-2">
                Online Consultation
              </h3>
              <p className="text-sm text-gray-600">
                Connect with doctors through secure video consultation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center text-slate-800 mb-10">
          Our Services
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              Doctor Appointments
            </h3>
            <p className="text-gray-600 text-sm">
              Easily book and manage doctor appointments online.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              Video Consultation
            </h3>
            <p className="text-gray-600 text-sm">
              Meet doctors online via secure video consultation.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-2 transition-all duration-300">
            <h3 className="text-xl font-semibold text-blue-600 mb-2">
              Medical Records
            </h3>
            <p className="text-gray-600 text-sm">
              Store and manage your medical records safely.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16 text-center">
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
    </div>
  );
}
