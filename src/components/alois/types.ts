// ─── Alois Memory Aid & Wellness Data Contracts ─────────────────────────────

export type AloisTab = "home" | "meds" | "routine" | "safety" | "profile"

export interface MedicationItem {
  id: string
  name: string
  dosage: string
  timeOfDay: "morning" | "afternoon" | "night"
  timeStr: string
  instructions: string
  taken: boolean
  color: string
}

export interface DailyChoreItem {
  id: string
  title: string
  category: "personal" | "activity" | "cognitive"
  timeStr: string
  completed: boolean
}

export interface DoctorAppointment {
  id: string
  doctorName: string
  specialty: string
  hospital: string
  dateStr: string
  timeStr: string
  status: "upcoming" | "completed"
  rating: number
  avatarColor: string
}
