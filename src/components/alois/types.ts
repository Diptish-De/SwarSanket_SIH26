export type AloisTab = "home" | "appointments" | "doctorInfo" | "progress" | "profile" | "medications" | "dailyCare"

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

export interface ClinicalTestItem {
  id: string

  title: string

  subtitle: string

  duration: string

  category: "vocal_biomarker" | "saccadic_eye" | "mmse_cognitive" | "motor_speed"

  status: "ready" | "in_progress" | "completed"

  lastScore?: string

  confidence?: string
}
