import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-blue-300 bg-gradient-to-b from-blue-50 via-blue-100 to-blue-200">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Logo + Description */}
          <div>
            <h2 className="text-xl font-bold text-blue-700">
              Smart Healthcare
            </h2>
            <div className="mt-2 h-1 w-12 rounded bg-blue-600"></div>
            <p className="mt-3 text-sm text-gray-700">
              Online doctor appointments, telemedicine consultations,
              and healthcare management platform.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="mb-3 font-semibold text-gray-800 border-l-4 border-blue-600 pl-2">
              Quick Links
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <Link to="/" className="hover:text-blue-700 transition">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/appointments" className="hover:text-blue-700 transition">
                  Appointments
                </Link>
              </li>
              <li>
                <Link to="/consultation" className="hover:text-blue-700 transition">
                  Consultation
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-blue-700 transition">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-blue-700 transition">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="mb-3 font-semibold text-gray-800 border-l-4 border-blue-600 pl-2">
              Account
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>
                <Link to="/login" className="hover:text-blue-700 transition">
                  Login
                </Link>
              </li>
              <li>
                <Link to="/signup" className="hover:text-blue-700 transition">
                  Sign Up
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-3 font-semibold text-gray-800 border-l-4 border-blue-600 pl-2">
              Contact
            </h3>
            <p className="text-sm text-gray-700">
              Email: support@smarthealth.com
            </p>
            <p className="text-sm text-gray-700">
              Phone: +94 71 123 4567
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t border-blue-300 pt-6 text-center text-sm text-gray-700">
          © 2026 Smart Healthcare Platform. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
