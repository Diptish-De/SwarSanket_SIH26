import React, { useState } from "react"
import {
  X,
  Stethoscope,
  Star,
  Clock,
  Calendar,
  Check,
  ShieldCheck,
  FileText,
} from "lucide-react"

interface AloisDoctorBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onBookingConfirmed?: () => void
  fontFamily?: string
}

export default function AloisDoctorBookingModal({
  isOpen,
  onClose,
  onBookingConfirmed,
  fontFamily = "'Outfit', sans-serif",
}: AloisDoctorBookingModalProps) {
  const [selectedDoctorId, setSelectedDoctorId] = useState("doc-1")
  const [selectedSlot, setSelectedSlot] = useState("Tomorrow, 10:30 AM")
  const [attachReport, setAttachReport] = useState(true)
  const [isBooked, setIsBooked] = useState(false)

  if (!isOpen) return null

  const doctors = [
    {
      id: "doc-1",
      name: "Dr. Arvind Sharma",
      qualifications: "MD, DM (Neurology - AIIMS)",
      hospital: "Apollo Multispecialty Hospitals",
      rating: 4.9,
      experience: "16+ yrs exp",
      fee: "₹1,200",
    },
    {
      id: "doc-2",
      name: "Dr. Priya Nair",
      qualifications: "MD, Cognitive Geriatrician (NIMHANS)",
      hospital: "Fortis Memorial Research Institute",
      rating: 4.8,
      experience: "12+ yrs exp",
      fee: "₹1,000",
    },
  ]

  const slots = ["Today, 4:30 PM", "Tomorrow, 10:30 AM", "Tomorrow, 2:00 PM"]

  const handleConfirm = () => {
    setIsBooked(true)
    setTimeout(() => {
      setIsBooked(false)
      if (onBookingConfirmed) onBookingConfirmed()
      onClose()
    }, 1400)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-slate-100 overflow-hidden space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Stethoscope className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Neurologist Teleconsult
              </span>
              <h3
                style={{ fontFamily }}
                className="text-lg font-bold text-slate-900"
              >
                Book Consultation
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Doctor Selection */}
        <div className="space-y-2">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Select Specialist
          </label>
          <div className="space-y-2">
            {doctors.map((doc) => {
              const isSelected = selectedDoctorId === doc.id
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoctorId(doc.id)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50/70 border-blue-500 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4
                        style={{ fontFamily }}
                        className="text-sm font-bold text-slate-900"
                      >
                        {doc.name}
                      </h4>
                      <p className="text-[11px] text-blue-600 font-medium">
                        {doc.qualifications}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {doc.hospital}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{doc.rating}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Available Time Slots */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Available Slots
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {slots.map((slot) => {
              const isSelected = selectedSlot === slot
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{slot}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Attach Screening Report Toggle */}
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <div className="text-xs font-bold text-slate-800">
                Attach Voice Screening Report
              </div>
              <div className="text-[10px] text-slate-500">
                Shares acoustic features with doctor
              </div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={attachReport}
            onChange={(e) => setAttachReport(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
          />
        </div>

        {/* Confirm Button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={isBooked}
          className="w-full py-3 px-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-600/25 active:scale-[0.98] transition-all"
        >
          {isBooked ? (
            <>
              <Check className="w-4 h-4" />
              <span>Appointment Confirmed!</span>
            </>
          ) : (
            <>
              <Calendar className="w-4 h-4" />
              <span>Confirm Teleconsult Booking</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
