import { useEffect, useState } from "react";

type DoctorProfile = {
  name: string;
  email: string;
  specialization: string;
  phone: string;
  hospital: string;
};

export default function DoctorProfile() {
  const [profile, setProfile] = useState<DoctorProfile>({
    name: "",
    email: "",
    specialization: "",
    phone: "",
    hospital: "",
  });

  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    // TODO: Replace with backend API call
    const dummyData = {
      name: "Dr. John Doe",
      email: "doctor@example.com",
      specialization: "Cardiology",
      phone: "0771234567",
      hospital: "City Hospital",
    };

    setProfile(dummyData);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  }

  function handleSave() {
    // TODO: Send PUT request to backend
    setSavedMessage("Profile updated successfully");

    setTimeout(() => {
      setSavedMessage("");
    }, 2000);
  }

  return (
    <div className="max-w-4xl mx-auto mt-6">
      <div className="bg-white shadow-lg rounded-2xl p-6">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">
          Doctor Profile
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-slate-600">Full Name</label>
            <input
              type="text"
              name="name"
              value={profile.name}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Email</label>
            <input
              type="text"
              name="email"
              value={profile.email}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Specialization</label>
            <input
              type="text"
              name="specialization"
              value={profile.specialization}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>

          <div>
            <label className="text-sm text-slate-600">Phone</label>
            <input
              type="text"
              name="phone"
              value={profile.phone}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-slate-600">Hospital / Clinic</label>
            <input
              type="text"
              name="hospital"
              value={profile.hospital}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-lg"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Save Changes
        </button>

        {savedMessage && (
          <p className="text-green-600 mt-3">{savedMessage}</p>
        )}
      </div>
    </div>
  );
}