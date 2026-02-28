import React, { useState } from "react";
import { Send, CheckCircle, Upload, FileText, Trash2, AlertCircle } from "lucide-react";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyQ8BVOexUwmyq3-Bdd1rbKFfYVk4KskR4IkoBUlI_SQ6qPhIljs_YfsI1geRhkeP01/exec";

const PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec",
  "Saskatchewan", "Yukon"
];

const INCOME_DOCUMENT_MAP: Record<string, string> = {
  incomeT4: "T4 Slip (Employment Income)",
  incomeT4A: "T4A Slip (Self-Employed / Gig Work)",
  incomeT4E: "T4E Slip (Employment Insurance Benefits)",
  incomeT5: "T5 or T3 Slip (Investment / Interest Income)",
  incomeT2202: "T2202 Form (Tuition / Education)",
};

const TaxIntakeSystem = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    firstName1: "", middleName1: "", lastName1: "",
    email1: "", phone1: "",
    sin1: "", dob1: "", citizen1: "", maritalStatus: "",
    name2: "", sin2: "", dob2: "", citizen2: "",
    marriedIn2025: "", marriageDate: "",
    aptNo: "", streetNo: "", city: "", province: "", postalCode: "",
    dependents: [] as any[],
    incomeT4: false, incomeT4A: false, incomeT4E: false, incomeT5: false,
    incomeT2202: false, incomeOther: false, incomeOtherText: "",
    hasSelfEmployed: "", grossIncome: "", platformFees: "",
    totalKm: "", businessKm: "", gasFuel: "", repairs: "",
    rentPaid: "", landlord: "", propertyTax: "", municipality: "",
    medicalExpenses: "", childcareExpenses: "", rrsp: "",
    donations: [] as any[],
    hasMovingExpenses: "", movingReason: "",
    oldHomeAddress: "", newHomeAddress: "",
    oldWorkSchoolAddress: "", newWorkSchoolAddress: "",
    moveDate: "", distanceMoved: "",
    movingTransportStorage: "", movingTravelVehicle: "", movingTravelMeals: "",
    movingAccommodation: "", movingTempLiving: "", movingOldResidenceCosts: "",
    movingRealEstateFees: "", movingLegalFees: "", movingOtherCosts: "",
    movingEmployerReimbursement: "",
    authorized: false, signature: "", signatureDate: ""
  });

  const handleChange = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSINChange = (field: string, value: string) =>
    handleChange(field, value.replace(/\D/g, "").slice(0, 9));

  const handlePostalCodeChange = (value: string) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    let formatted = clean;
    if (clean.length > 3) formatted = clean.slice(0, 3) + " " + clean.slice(3, 6);
    handleChange("postalCode", formatted);
  };

  const isValidPostalCode = (code: string) =>
    /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/.test(code);

  const handleMaritalStatusChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      maritalStatus: value,
      ...(value !== "married" && value !== "common-law"
        ? { marriedIn2025: "", marriageDate: "" } : {}),
    }));
  };

  const needsSpouseInfo = () =>
    formData.maritalStatus === "married" || formData.maritalStatus === "common-law";

  const addDependent = () =>
    setFormData(prev => ({
      ...prev,
      dependents: [...prev.dependents, { id: Date.now(), name: "", sin: "", dob: "", relationship: "" }],
    }));
  const updateDependent = (id: number, field: string, value: string) =>
    setFormData(prev => ({
      ...prev,
      dependents: prev.dependents.map(d =>
        d.id === id ? { ...d, [field]: field === "sin" ? value.replace(/\D/g, "").slice(0, 9) : value } : d
      ),
    }));
  const removeDependent = (id: number) =>
    setFormData(prev => ({ ...prev, dependents: prev.dependents.filter(d => d.id !== id) }));

  const addDonation = () =>
    setFormData(prev => ({
      ...prev,
      donations: [...prev.donations, { id: Date.now(), charityName: "", amount: "", donationDate: "" }],
    }));
  const updateDonation = (id: number, field: string, value: string) =>
    setFormData(prev => ({
      ...prev,
      donations: prev.donations.map(d => (d.id === id ? { ...d, [field]: value } : d)),
    }));
  const removeDonation = (id: number) =>
    setFormData(prev => ({ ...prev, donations: prev.donations.filter(d => d.id !== id) }));

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles: any[] = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { alert(`File ${file.name} is too large. Max 5MB.`); continue; }
      const base64 = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      newFiles.push({ name: file.name, type: file.type, size: file.size, data: base64 });
    }
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) =>
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));

  // Get required documents based on selected income sources
  const getRequiredDocuments = () => {
    const docs: string[] = [];
    Object.entries(INCOME_DOCUMENT_MAP).forEach(([key, label]) => {
      if ((formData as any)[key]) docs.push(label);
    });
    if (formData.incomeOther && formData.incomeOtherText)
      docs.push(`Other: ${formData.incomeOtherText}`);
    return docs;
  };

  const fullAddress = [
    formData.aptNo ? `Apt ${formData.aptNo}` : "",
    formData.streetNo,
    formData.city,
    formData.province,
    formData.postalCode
  ].filter(Boolean).join(", ");

  const handleSubmit = async () => {
    if (!formData.firstName1 || !formData.lastName1 || !formData.email1 || !formData.phone1 ||
      !formData.sin1 || !formData.dob1 || !formData.citizen1 ||
      !formData.maritalStatus || !formData.streetNo || !formData.city ||
      !formData.province || !formData.postalCode ||
      !formData.hasSelfEmployed || !formData.authorized ||
      !formData.signature || !formData.signatureDate) {
      alert("Please fill all required fields marked with *"); return;
    }
    if (formData.sin1.length !== 9) { alert("SIN must be exactly 9 digits."); return; }
    if (!isValidPostalCode(formData.postalCode)) { alert("Please enter a valid Canadian postal code (e.g. M5V 3L9)."); return; }
    if (needsSpouseInfo() && (!formData.name2 || !formData.sin2 || !formData.dob2 || !formData.citizen2)) {
      alert("Please fill all spouse information fields"); return;
    }
    if (needsSpouseInfo() && formData.sin2 && formData.sin2.length !== 9) {
      alert("Spouse SIN must be exactly 9 digits."); return;
    }
    setLoading(true);
    try {
      const submissionData = {
        ...formData,
        fullAddress,
        documents: uploadedFiles,
        submittedAt: new Date().toISOString()
      };
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify(submissionData),
      });
      setSubmitted(true);
    } catch (error) {
      alert("Error submitting form. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const movingTotal = [
    formData.movingTransportStorage, formData.movingTravelVehicle,
    formData.movingTravelMeals, formData.movingAccommodation,
    formData.movingTempLiving, formData.movingOldResidenceCosts,
    formData.movingRealEstateFees, formData.movingLegalFees, formData.movingOtherCosts
  ].reduce((sum, val) => sum + parseFloat(val || "0"), 0);

  const movingNet = movingTotal - parseFloat(formData.movingEmployerReimbursement || "0");

  if (submitted) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md text-center">
        <CheckCircle className="text-green-600 mx-auto mb-4" size={64} />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thank You!</h2>
        <p className="text-gray-600 mb-4">Your tax intake form has been submitted successfully.</p>
        <p className="text-sm text-gray-500">We will contact you shortly.</p>
      </div>
    </div>
  );

  const requiredDocs = getRequiredDocuments();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">2025 T1 Personal Tax Intake Form</h1>
          <p className="text-gray-600">Please fill out all required fields (*)</p>
        </div>

        <div className="space-y-8">

          {/* SECTION 1 */}
          <div className="border-l-4 border-blue-600 pl-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">1. Personal &amp; Spouse Information</h2>
            <div className="space-y-4">

              {/* Name Fields */}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">First Name *</label>
                  <input type="text" value={formData.firstName1}
                    onChange={e => handleChange("firstName1", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Middle Name</label>
                  <input type="text" value={formData.middleName1}
                    onChange={e => handleChange("middleName1", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Last Name *</label>
                  <input type="text" value={formData.lastName1}
                    onChange={e => handleChange("lastName1", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Email and Phone */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address *</label>
                  <input type="email" placeholder="example@email.com"
                    value={formData.email1}
                    onChange={e => handleChange("email1", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input type="tel" placeholder="416-123-4567"
                    value={formData.phone1}
                    onChange={e => handleChange("phone1", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* SIN and DOB */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Social Insurance Number *</label>
                  <input type="text" placeholder="123456789" maxLength={9}
                    value={formData.sin1}
                    onChange={e => handleSINChange("sin1", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {formData.sin1 && formData.sin1.length !== 9 && <p className="text-red-500 text-xs mt-1">SIN must be exactly 9 digits</p>}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth *</label>
                  <input type="date" value={formData.dob1}
                    onChange={e => handleChange("dob1", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Canadian Citizen? *</label>
                  <select value={formData.citizen1}
                    onChange={e => handleChange("citizen1", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Marital Status *</label>
                  <select value={formData.maritalStatus}
                    onChange={e => handleMaritalStatusChange(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                    <option value="">Select...</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="common-law">Common-Law</option>
                    <option value="divorced">Divorced</option>
                    <option value="separated">Separated</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
              </div>

              {needsSpouseInfo() && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Did you get married/enter common-law in 2025?</label>
                    <select value={formData.marriedIn2025}
                      onChange={e => handleChange("marriedIn2025", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                      <option value="">Select...</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                  {formData.marriedIn2025 === "yes" && (
                    <div className="bg-yellow-50 p-4 rounded-lg border-2 border-yellow-300">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Marriage/Common-Law Start Date *</label>
                      <input type="date" value={formData.marriageDate}
                        onChange={e => handleChange("marriageDate", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500" />
                    </div>
                  )}
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4 border-2 border-blue-200">
                    <h3 className="font-semibold text-gray-800">Spouse Information Required</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Spouse Full Name *</label>
                        <input type="text" value={formData.name2}
                          onChange={e => handleChange("name2", e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Spouse SIN *</label>
                        <input type="text" placeholder="123456789" maxLength={9}
                          value={formData.sin2}
                          onChange={e => handleSINChange("sin2", e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg" />
                        {formData.sin2 && formData.sin2.length !== 9 && <p className="text-red-500 text-xs mt-1">SIN must be exactly 9 digits</p>}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Spouse DOB *</label>
                        <input type="date" value={formData.dob2}
                          onChange={e => handleChange("dob2", e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Spouse Canadian Citizen? *</label>
                        <select value={formData.citizen2}
                          onChange={e => handleChange("citizen2", e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg">
                          <option value="">Select...</option>
                          <option value="yes">Yes</option>
                          <option value="no">No</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Address */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-3">Current Address</h3>
                <div className="space-y-3">
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Apt / Unit No.</label>
                      <input type="text" placeholder="e.g. 204"
                        value={formData.aptNo}
                        onChange={e => handleChange("aptNo", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Street No. & Street Name *</label>
                      <input type="text" placeholder="e.g. 123 Main Street"
                        value={formData.streetNo}
                        onChange={e => handleChange("streetNo", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">City *</label>
                      <input type="text" placeholder="e.g. Toronto"
                        value={formData.city}
                        onChange={e => handleChange("city", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Province *</label>
                      <select value={formData.province}
                        onChange={e => handleChange("province", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                        <option value="">Select...</option>
                        {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Postal Code *</label>
                      <input type="text" placeholder="M5V 3L9" maxLength={7}
                        value={formData.postalCode}
                        onChange={e => handlePostalCodeChange(e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${formData.postalCode && !isValidPostalCode(formData.postalCode) ? "border-red-400" : ""}`} />
                      {formData.postalCode && !isValidPostalCode(formData.postalCode) && (
                        <p className="text-red-500 text-xs mt-1">Format must be A1B 2C3</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dependents */}
              <div className="mt-6 pt-6 border-t-2 border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-gray-800">👶 Dependents</h3>
                  <button onClick={addDependent} type="button" className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">+ Add Dependent</button>
                </div>
                {formData.dependents.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No dependents added.</p>
                ) : (
                  <div className="space-y-4">
                    {formData.dependents.map((dep, index) => (
                      <div key={dep.id} className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-gray-700">Dependent {index + 1}</h4>
                          <button onClick={() => removeDependent(dep.id)} type="button" className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Legal Name</label>
                            <input type="text" value={dep.name}
                              onChange={e => updateDependent(dep.id, "name", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">SIN</label>
                            <input type="text" placeholder="123456789" maxLength={9}
                              value={dep.sin}
                              onChange={e => updateDependent(dep.id, "sin", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg" />
                            {dep.sin && dep.sin.length !== 9 && <p className="text-red-500 text-xs mt-1">SIN must be 9 digits</p>}
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Date of Birth</label>
                            <input type="date" value={dep.dob}
                              onChange={e => updateDependent(dep.id, "dob", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Relationship</label>
                            <select value={dep.relationship}
                              onChange={e => updateDependent(dep.id, "relationship", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg">
                              <option value="">Select...</option>
                              <option value="child">Child</option>
                              <option value="stepchild">Stepchild</option>
                              <option value="parent">Parent</option>
                              <option value="grandchild">Grandchild</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 2 */}
          <div className="border-l-4 border-green-600 pl-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">2. Income Sources</h2>
            <div className="space-y-2">
              {[
                { key: "incomeT4", label: "T4 Slips (Employment)" },
                { key: "incomeT4A", label: "T4A/Self-Employed (Uber, Lyft, Gig Work)" },
                { key: "incomeT4E", label: "T4E (EI Benefits)" },
                { key: "incomeT5", label: "T5/T3 (Investment/Interest)" },
                { key: "incomeT2202", label: "T2202 (Student Tuition)" },
                { key: "incomeOther", label: "Other" },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2">
                  <input type="checkbox" checked={(formData as any)[item.key]}
                    onChange={e => handleChange(item.key, e.target.checked)} className="w-5 h-5" />
                  <span>{item.label}</span>
                </label>
              ))}
              {formData.incomeOther && (
                <input type="text" placeholder="Please specify..."
                  value={formData.incomeOtherText}
                  onChange={e => handleChange("incomeOtherText", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg ml-7" />
              )}
            </div>
          </div>

          {/* SECTION 3 */}
          <div className="border-l-4 border-purple-600 pl-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">3. Self-Employed Worksheet</h2>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Do you have self-employed or Uber/Lyft income? *</label>
              <select value={formData.hasSelfEmployed}
                onChange={e => handleChange("hasSelfEmployed", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            {formData.hasSelfEmployed === "yes" && (
              <div className="mt-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Total Gross Income</label>
                    <input type="number" step="0.01" value={formData.grossIncome}
                      onChange={e => handleChange("grossIncome", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Platform Fees</label>
                    <input type="number" step="0.01" value={formData.platformFees}
                      onChange={e => handleChange("platformFees", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Total KM Driven</label>
                    <input type="number" value={formData.totalKm}
                      onChange={e => handleChange("totalKm", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Business KM</label>
                    <input type="number" value={formData.businessKm}
                      onChange={e => handleChange("businessKm", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Gas/Fuel</label>
                    <input type="number" step="0.01" value={formData.gasFuel}
                      onChange={e => handleChange("gasFuel", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Repairs/Maintenance</label>
                    <input type="number" step="0.01" value={formData.repairs}
                      onChange={e => handleChange("repairs", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 4 */}
          <div className="border-l-4 border-orange-600 pl-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">4. Credits &amp; Deductions</h2>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Rent Paid (Total 2025)</label>
                  <input type="number" step="0.01" value={formData.rentPaid}
                    onChange={e => handleChange("rentPaid", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Landlord Name</label>
                  <input type="text" value={formData.landlord}
                    onChange={e => handleChange("landlord", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Medical Expenses (Family Total)</label>
                <input type="number" step="0.01" value={formData.medicalExpenses}
                  onChange={e => handleChange("medicalExpenses", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Childcare Expenses</label>
                <input type="number" step="0.01" value={formData.childcareExpenses}
                  onChange={e => handleChange("childcareExpenses", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">RRSP Contributions</label>
                <input type="number" step="0.01" value={formData.rrsp}
                  onChange={e => handleChange("rrsp", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>

              {/* Donations */}
              <div className="mt-8 pt-6 border-t-2 border-orange-300">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">💝 Donations to Canadian Charities</h3>
                    <p className="text-sm text-gray-600 mt-1">Add all charitable donations made in 2025</p>
                  </div>
                  <button onClick={addDonation} type="button" className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-700">+ Add Donation</button>
                </div>
                {formData.donations.length === 0 ? (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-6 text-center">
                    <p className="text-sm text-gray-600">No donations added yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.donations.map((donation, index) => (
                      <div key={donation.id} className="bg-orange-50 p-4 rounded-lg border-2 border-orange-200">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-semibold text-gray-700">Donation {index + 1}</h4>
                          <button onClick={() => removeDonation(donation.id)} type="button" className="text-red-600 hover:text-red-800 flex items-center gap-1">
                            <Trash2 size={18} /><span className="text-sm">Remove</span>
                          </button>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Charity Name</label>
                            <input type="text" placeholder="e.g., Canadian Red Cross"
                              value={donation.charityName}
                              onChange={e => updateDonation(donation.id, "charityName", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Amount ($)</label>
                            <input type="number" step="0.01" placeholder="0.00"
                              value={donation.amount}
                              onChange={e => updateDonation(donation.id, "amount", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg" />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Donation Date</label>
                            <input type="date" value={donation.donationDate}
                              onChange={e => updateDonation(donation.id, "donationDate", e.target.value)}
                              className="w-full px-3 py-2 border rounded-lg" />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="bg-orange-100 p-3 rounded-lg border border-orange-300">
                      <p className="text-sm font-semibold text-gray-800">
                        Total Donations: ${formData.donations.reduce((sum, d) => sum + parseFloat(d.amount || "0"), 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 5 */}
          <div className="border-l-4 border-indigo-600 pl-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">5. Moving Expenses (Line 21900)</h2>
            <div className="bg-indigo-50 border-l-4 border-indigo-500 p-4 mb-4">
              <p className="text-sm text-indigo-800 font-semibold mb-1">Did you move for work or school?</p>
              <p className="text-xs text-indigo-700">You can claim moving expenses if your new home is at least 40 km closer to your new workplace or school.</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Did you have moving expenses in 2025?</label>
              <select value={formData.hasMovingExpenses}
                onChange={e => handleChange("hasMovingExpenses", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>
            {formData.hasMovingExpenses === "yes" && (
              <div className="space-y-4 bg-indigo-50 p-6 rounded-lg border-2 border-indigo-200">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Reason for Move</label>
                  <select value={formData.movingReason}
                    onChange={e => handleChange("movingReason", e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg">
                    <option value="">Select...</option>
                    <option value="new-job">New Job/Employment</option>
                    <option value="job-transfer">Job Transfer</option>
                    <option value="student">Full-Time Post-Secondary Student</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-indigo-300">
                  <h3 className="font-semibold text-gray-800 mb-3">Home Addresses</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Old Home Address</label>
                      <textarea rows={2} value={formData.oldHomeAddress}
                        onChange={e => handleChange("oldHomeAddress", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">New Home Address</label>
                      <textarea rows={2} value={formData.newHomeAddress}
                        onChange={e => handleChange("newHomeAddress", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-indigo-300">
                  <h3 className="font-semibold text-gray-800 mb-3">Work/School Addresses</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Old Work/School Address</label>
                      <textarea rows={2} value={formData.oldWorkSchoolAddress}
                        onChange={e => handleChange("oldWorkSchoolAddress", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">New Work/School Address</label>
                      <textarea rows={2} value={formData.newWorkSchoolAddress}
                        onChange={e => handleChange("newWorkSchoolAddress", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Move Date</label>
                    <input type="date" value={formData.moveDate}
                      onChange={e => handleChange("moveDate", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Distance Moved (KM)</label>
                    <input type="number" placeholder="Must be at least 40 km"
                      value={formData.distanceMoved}
                      onChange={e => handleChange("distanceMoved", e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
                <div className="pt-4 border-t border-indigo-300">
                  <h3 className="font-semibold text-gray-800 mb-3">Eligible Moving Expenses</h3>
                  <div className="space-y-3">
                    {[
                      { key: "movingTransportStorage", label: "Transportation & Storage", hint: "Movers, truck rental, packing, insurance" },
                      { key: "movingTravelVehicle", label: "Travel - Vehicle Expenses", hint: "Gas, maintenance for moving trip" },
                      { key: "movingTravelMeals", label: "Travel - Meals", hint: "Meals during moving trip" },
                      { key: "movingAccommodation", label: "Travel - Accommodation", hint: "Hotels during moving trip" },
                      { key: "movingTempLiving", label: "Temporary Living (Max 15 days)", hint: "Hotel, meals near new location" },
                      { key: "movingOldResidenceCosts", label: "Old Residence Costs", hint: "Lease cancellation, maintaining vacant home (max $5,000)" },
                      { key: "movingRealEstateFees", label: "Real Estate Fees", hint: "Agent commission, advertising costs" },
                      { key: "movingLegalFees", label: "Legal Fees & Land Transfer Taxes", hint: "Legal fees for buying/selling" },
                      { key: "movingOtherCosts", label: "Other Eligible Costs", hint: "Address changes, utility hookups" },
                    ].map(item => (
                      <div key={item.key}>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">
                          {item.label}
                          <span className="text-xs font-normal text-gray-500 block">{item.hint}</span>
                        </label>
                        <input type="number" step="0.01" placeholder="$0.00"
                          value={(formData as any)[item.key]}
                          onChange={e => handleChange(item.key, e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg" />
                      </div>
                    ))}
                    <div className="pt-4 border-t border-indigo-300">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        Employer Reimbursement
                        <span className="text-xs font-normal text-gray-500 block">Will be deducted from total</span>
                      </label>
                      <input type="number" step="0.01" placeholder="$0.00"
                        value={formData.movingEmployerReimbursement}
                        onChange={e => handleChange("movingEmployerReimbursement", e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg" />
                    </div>
                  </div>
                  <div className="bg-indigo-100 p-4 rounded-lg border border-indigo-300 mt-4">
                    <p className="text-sm font-semibold">Total Moving Expenses: ${movingTotal.toFixed(2)}</p>
                    {parseFloat(formData.movingEmployerReimbursement || "0") > 0 && (
                      <p className="text-sm mt-1">Less Reimbursement: -${parseFloat(formData.movingEmployerReimbursement || "0").toFixed(2)}</p>
                    )}
                    <p className="text-sm font-bold mt-2 pt-2 border-t border-indigo-300">Net Claimable: ${movingNet.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6 - Upload Documents */}
          <div className="border-l-4 border-purple-600 pl-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">6. Upload Documents</h2>

            {/* Dynamic highlighted message based on income selection */}
            {requiredDocs.length > 0 ? (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-5">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-yellow-600 mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-bold text-yellow-800 mb-2">
                      ⚠️ Based on your selected income sources, please upload the following documents:
                    </p>
                    <ul className="space-y-1">
                      {requiredDocs.map((doc, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-yellow-800">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full shrink-0"></span>
                          {doc}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
                <p className="text-sm text-blue-700">
                  💡 Select your income sources in Section 2 to see which documents you need to upload.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">Upload your tax documents (T4, T5, receipts, etc.). Max 5MB per file.</p>
            <div className="mb-4">
              <label className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 bg-gray-50">
                <div className="text-center">
                  <Upload className="mx-auto mb-2 text-gray-400" size={40} />
                  <span className="text-sm text-gray-600">Click to upload files or drag and drop</span>
                  <span className="text-xs text-gray-500 block mt-1">PDF, JPG, PNG — Max 5MB per file</span>
                </div>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">Uploaded Files ({uploadedFiles.length})</p>
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                    <div className="flex items-center gap-2">
                      <FileText size={20} className="text-blue-600" />
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button onClick={() => removeFile(index)} className="text-red-600 hover:text-red-800"><Trash2 size={18} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 7 */}
          <div className="border-l-4 border-red-600 pl-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">7. Authorization</h2>
            <div className="space-y-4">
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={formData.authorized}
                  onChange={e => handleChange("authorized", e.target.checked)} className="w-5 h-5 mt-1" />
                <span className="text-sm">I authorize the tax preparer to represent me with the CRA for 2025.</span>
              </label>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Signature (Type your full name) *</label>
                <input type="text" value={formData.signature}
                  onChange={e => handleChange("signature", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Today's Date *</label>
                <input type="date" value={formData.signatureDate}
                  onChange={e => handleChange("signatureDate", e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="pt-6">
            <button onClick={handleSubmit} disabled={loading}
              className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-blue-700 flex items-center justify-center gap-2 disabled:bg-gray-400">
              {loading ? (
                <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> Submitting...</>
              ) : (
                <><Send size={24} /> Submit Tax Intake Form</>
              )}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TaxIntakeSystem;
