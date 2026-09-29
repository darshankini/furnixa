import type { LeadStatus } from './phases'

/** Temporary sample data for the dashboard until the leads API exists */
export interface DummyLead {
  id: number
  projectName: string
  clientName: string
  status: LeadStatus
  assignedTo: string
  createdAt: Date
  updatedAt: Date
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

function ago(ms: number): Date {
  return new Date(Date.now() - ms)
}

export const DUMMY_LEADS: DummyLead[] = [
  { id: 112, projectName: 'Modular Kitchen – 3BHK', clientName: 'Anita Sharma', status: 'ENQUIRY', assignedTo: 'Vikram Rao', createdAt: ago(2 * HOUR), updatedAt: ago(2 * HOUR) },
  { id: 111, projectName: 'Office Workstations (24 seats)', clientName: 'Nexa Softech Pvt Ltd', status: 'ENQUIRY', assignedTo: 'Priya Nair', createdAt: ago(5 * HOUR), updatedAt: ago(4 * HOUR) },
  { id: 110, projectName: 'Master Bedroom Wardrobe', clientName: 'Rohan Desai', status: 'QUOTATION', assignedTo: 'Vikram Rao', createdAt: ago(1 * DAY + 3 * HOUR), updatedAt: ago(6 * HOUR) },
  { id: 109, projectName: 'Café Seating & Counter', clientName: 'Brew Street Café', status: 'OPTIMISATION', assignedTo: 'Sneha Kulkarni', createdAt: ago(3 * DAY), updatedAt: ago(1 * DAY) },
  { id: 108, projectName: 'Living Room TV Unit', clientName: 'Farhan Qureshi', status: 'QUOTATION', assignedTo: 'Priya Nair', createdAt: ago(9 * DAY), updatedAt: ago(2 * DAY) },
  { id: 107, projectName: 'Hotel Lobby Furniture', clientName: 'Sea Breeze Resorts', status: 'PURCHASE', assignedTo: 'Arjun Mehta', createdAt: ago(12 * DAY), updatedAt: ago(2 * DAY) },
  { id: 106, projectName: 'School Library Shelving', clientName: 'Green Valley School', status: 'PRODUCTION', assignedTo: 'Sneha Kulkarni', createdAt: ago(18 * DAY), updatedAt: ago(3 * DAY) },
  { id: 105, projectName: 'Kids Room Bunk Bed', clientName: 'Meera Iyer', status: 'PRODUCTION', assignedTo: 'Vikram Rao', createdAt: ago(21 * DAY), updatedAt: ago(4 * DAY) },
  { id: 104, projectName: 'Clinic Reception Desk', clientName: 'Dr. Kapoor Dental Care', status: 'DISPATCH', assignedTo: 'Arjun Mehta', createdAt: ago(26 * DAY), updatedAt: ago(5 * DAY) },
  { id: 103, projectName: 'Walk-in Closet', clientName: 'Sanjay Patil', status: 'INVOICE', assignedTo: 'Priya Nair', createdAt: ago(40 * DAY), updatedAt: ago(8 * DAY) },
  { id: 102, projectName: 'Conference Table (12-seater)', clientName: 'Orbit Logistics', status: 'OPTIMISATION', assignedTo: 'Arjun Mehta', createdAt: ago(45 * DAY), updatedAt: ago(9 * DAY) },
  { id: 101, projectName: 'Pooja Unit in Teak', clientName: 'Lakshmi Venkatesh', status: 'ENQUIRY', assignedTo: 'Sneha Kulkarni', createdAt: ago(50 * DAY), updatedAt: ago(12 * DAY) },
]
