import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-blue-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Logo + Description */}
          <div>
            <h2 className="text-xl font-bold text-blue-600">
              Smart Healthcare
            </h2>
            <p className="mt-3 text-sm text-gray-600">
              Online doctor appointments, telemedicine consultations,
              and healthcare management platform.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 font-semibold text-gray-800">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/" className="hover:text-blue-600 transition">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/doctors" className="hover:text-blue-600 transition">
                  Doctors
                </Link>
              </li>
              <li>
                <Link
                  to="/appointments"
                  className="hover:text-blue-600 transition"
                >
                  Appointments
                </Link>
              </li>
              <li>
                <Link
                  to="/consultation"
                  className="hover:text-blue-600 transition"
                >
                  Consultation
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="mb-3 font-semibold text-gray-800">Account</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/login" className="hover:text-blue-600 transition">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-blue-600 transition">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 font-semibold text-gray-800">Contact</h3>
            <p className="text-sm text-gray-600">
              Email: support@smarthealth.com
            </p>
            <p className="text-sm text-gray-600">
              Phone: +94 71 123 4567
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-blue-100 pt-6 text-center text-sm text-gray-500">
          © 2026 Smart Healthcare Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}