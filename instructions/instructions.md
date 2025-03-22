# Project Overview

You are building an employee management system for a company that consists of multiple functions such as employee management, automatic attendance using face recognition, and automatic calculation of working hours and salaries.

You will be using Next.js, Shadcn UI, face-api.js, Supabase, and Prisma.

# Core Functionalities

App Navigation:

- Login
- Dashboard
- Employee Management
- Attendance Management
- Salary Management
- Permission Management
- Configuration

1. Login:

- Users register an account by entering data such as name, email, and password.
- Passwords are hashed using bcrypt before being stored.
- When a user log in, the system creates and uses a JWT token for authentication.
- Input validation and sanitization are implemented to prevent attacks, as well as rate limiting to prevent brute force attacks.

2. Employee Management:

- Add, edit, and delete employees (pop up modal for add, edit, and delete employees), also employee can upload their faces for input information as a data for face recognition.
- Display employee data in a table with action button to edit and delete the data.
- View employee details
- Search for employees
- Sort employees by different criteria
- Feature to manage employee contract
- Employees contract status are divided into permanent employees and training employees (employee contract status can be edited)
- Can calculate employee contracts from the time the employee first enters until the contract is completed and reminder will be sent to the employee when the contract is about to end
- Permanent employees will be given a contract number and a contract duration.
- Training employees will be given a training number and a training duration.
- Features to update or change the status of expired employee contracts, such as extensions or changes to other types of contracts.
- Have a feature to change directly the employee's shift, and status SP (Surat Peringatan 'Tidak Ada', 'SP 1', 'SP 2', or 'SP 3')

3. Attendance Management:

- Working session consist of 3 part, namely main working hours, regular overtime working hours, and weekly overtime working hours.
- There are 3 employee shifts, namely non-shift, shift A, and shift B. shift will be used as markers for employees and can be changed with multiple employees.
- In one day consists of 2 shifts, namely shift A and shift B. Shift A consists of main working hours, lunch break, and regular overtime working hours. Shift B consists of main working hours, lunch break, and regular overtime working hours. A non-shift employee will only have 1 working part, namely main working hours.
- Automatic attendance using face recognition (using face-api.js).
- Attendance time will be recorded as SYSTIMESTAMP in the database.
- The requirement for an employee's working session is that the employee must do a face scan to start the working session, and then the employee have to do a face scan again when all the working hours have been completed to validate the end of the working session.
- After the employee input the face information, the system will automatically recognize the employee and record the attendance.
- Employee can do face scan to start the working session.
- Employee need to do a face scan again to end the working session.
- Time recording for the main working hours, regular overtime working hours, weekly overtime working hours, and lunch break time will run automatically before the employee scans their face again as a signal to end the working session.
- If employee do a face scan early, the time will be recorded as the time employee do the attendance, and the working session will start based on the configuration automatically.
- If employees check in outside the specified time, the start time of main working hours will be rounded up to 15 minutes after the specified time of employee attendance time.
- If the employee do the face scan before the entire working hours session is completed, then the finished hours will be recorded based on the working session when the employee do the face scan.
- All sessions for the day end for daily basis when all shifts have been completed (shift A and shift B).
- If a shift runs on 2 different days, make it into one entry (For example: shift A runs from 07:00 AM to 19:00 PM, and shift B runs from 19:00 PM to 07:00 AM, then it will be recorded as one entry for the day).
- After the employee do the attendance face scan, the system can start to record the working hours based on the configuration automatically.
- The main working hours will automatically start based on the configuration when the employee do the face scan, and will be inputted as SYSTIMESTAMP in the database.
- The lunch break time will be automatically start and end based on the configuration in between the main working hours, and will be inputted as SYSTIMESTAMP in the database.
- Lunch break time will not be calculated as working hours. If the lunch break time occurs between the main working hours, the calculation will be the main working hours minus the lunch break time.
- The regular overtime working hours will be automatically start and end based on the configuration after the main working hours and lunch break time, and will be inputted as SYSTIMESTAMP in the database.
- The weekly overtime working hours will apply on weekly basis, not daily basis. So the all weekly basis working hours will be calculated as the total weekly overtime working hours.
- The working hours will automatically stop based on the configuration when the working hours have been completed, and the employee just need to do a face scan again to validate the end of the working session.
- After all the working hours have been completed, the working hours will be calculated and recorded as SYSTIMESTAMP in the database. Such as main working hours, regular overtime working hours, and weekly overtime working hours.
- The daily basis will only consist of the main working hours, and regular overtime working hours.
- Each part working hours such as main working hours, lunch break, regular overtime working hours for daily basis runs linearly according to the clock sequence of working hours in the configuration.
- There is an attendance list feature to archive attendance that was completed the previous day, the cut off time is based on the configuration when the main working hours, regular overtime working hours, and weekly overtime working hours, and lunch break time for all shifts have been completed.
- Date search on archive attendance list.
- Display the archived attendance list in a table.
- Export attendance data to Excel
- Total hours of worked will be used to calculate total salary based on the employee's department and the employee's contract status.

4. Salary Management:

- There are 3 types of salary calculation, namely daily basis, monthly basis, and yearly basis.
- There are 3 types salary rates, namely main working hours rate, regular overtime working hours rate, and weekly overtime working hours rate.
- After all shifts in one day have been completed, the salary calculation will be done based on the employee's department and the employee's contract status. (Salary management can be done on daily basis, monthly basis, and yearly basis)
- Automatic calculation of main working hours, regular overtime working hours, and weekly overtime working hours and salaries based on the employee's department and the employee's contract status.
- The salary calculation (working hours and salary rates) will be based on the employee's working hours on the attendance management and the salary rates on the configuration.
- The main working hours will be calculated with main working hours rate, regular overtime working hours will be calculated with regular overtime working hours rate, and weekly overtime working hours will be calculated with weekly overtime working hours rate.
- The salary calculation will include employee allowances and will be based on the employee's department and the employee's contract status.
- Archive past salary data.
- Date search for archived salary data.
- View salary details
- Sort employees by different criteria
- Date search filter feature
- Salary management can sum the up the total salary and the total allowances of each employee.
- Export salary data to Excel
- If the training employee's contract has expired but the salary payment period has not yet arrived, and the employee is promoted to a contract employee, the salary amount will be adjusted automatically based on the contract employee's configuration according to the department.
- The display on the salary management page will be automatically updated according to the curent date and time, so that the information displayed is always up to date.

5. Permission Management:

- Add, edit, and delete permissions
- View permissions
- Search for permissions
- Sort permissions by different criteria

6. Configuration:

- Add, edit, and delete employee positions
- Add, edit, and delete employee shifts
- Add, edit, and delete employee departments
- Add, edit, and delete employee sub departments
- Edit the start and cut off time of main working hours, regular overtime working hours, weekly overtime working hours, and lunch break time. the start and cut off time will be assigned under the employee's sub department.
- When inputting the working hours configuration, add a feature to customize the working session such as being able to add or remove the working session (main working hours, regular overtime working hours, weekly overtime working hours, and lunch break time), and being able to edit the start and cut off time of the working session.
- Edit the employee rate for main working hours, regular overtime working hours, and weekly overtime working hours. (Input contains employee contract status, department, sub department, main working hours rate, regular overtime working hours rate, and weekly overtime working hours rate) and can be displayed in a table with action button to edit and delete the data.
- Add, edit, and delete allowance types
- Add, edit, and delete allowance values based on the allowance types and the employee's department and the employee's contract status. (Input contains allowance types, allowance values, and the employee's department and the employee's contract status)
- Add, edit, and delete permission types

# Doc

Supabase Connection on .env.local file:

# Connect to Supabase via connection pooling with Supavisor.

DATABASE_URL="postgresql://postgres.iemwqfigkreipeptpman:cxsbzffliT0l19l2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection to the database. Used for migrations.

DIRECT_URL="postgresql://postgres.iemwqfigkreipeptpman:cxsbzffliT0l19l2@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

POSTGRES_URL="postgres://postgres.iemwqfigkreipeptpman:cxsbzffliT0l19l2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
POSTGRES_PRISMA_URL="postgres://postgres.iemwqfigkreipeptpman:cxsbzffliT0l19l2@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
SUPABASE_URL="https://iemwqfigkreipeptpman.supabase.co"
NEXT_PUBLIC_SUPABASE_URL="https://iemwqfigkreipeptpman.supabase.co"
POSTGRES_URL_NON_POOLING="postgres://postgres.iemwqfigkreipeptpman:cxsbzffliT0l19l2@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
SUPABASE_JWT_SECRET="W2oFWaZ8OlSjIT9CCl20zlKsR8AQDD3DWG2l5rEa9w8uMD3zeE7iiHVfNjb+zsw09ZNpWzfjl1pWgT0GX+DWxA=="
POSTGRES_USER="postgres"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbXdxZmlna3JlaXBlcHRwbWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MjQyMzMsImV4cCI6MjA1NjIwMDIzM30.oM5hHZEHfTMlrz5859tmgQfmDtQQX-q-XmfAFqOAqGY"
POSTGRES_PASSWORD="cxsbzffliT0l19l2"
POSTGRES_DATABASE="postgres"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbXdxZmlna3JlaXBlcHRwbWFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDYyNDIzMywiZXhwIjoyMDU2MjAwMjMzfQ.NoWv6Z4jD3vyEyGeeS7PmqsIa7AxD_6yvkS5142jASU"
POSTGRES_HOST="db.iemwqfigkreipeptpman.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImllbXdxZmlna3JlaXBlcHRwbWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA2MjQyMzMsImV4cCI6MjA1NjIwMDIzM30.oM5hHZEHfTMlrz5859tmgQfmDtQQX-q-XmfAFqOAqGY"

Prisma Schema:
// prisma/schema.prisma

generator client {
provider = "prisma-client-js"
}

datasource db {
provider = "postgresql"
url = env("DATABASE_URL")
directUrl = env("DIRECT_URL")
}

model User {
id String @id @default(uuid())
email String @unique
name String
password String
role Role @default(EMPLOYEE)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
employee Employee?
permissions Permission[]

@@map("users")
}

model Employee {
id String @id @default(uuid())
userId String @unique
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
employeeId String @unique
department Department @relation(fields: [departmentId], references: [id])
departmentId String
subDepartment SubDepartment? @relation(fields: [subDepartmentId], references: [id])
subDepartmentId String?
shift Shift @relation(fields: [shiftId], references: [id])
shiftId String
contractType ContractType
contractNumber String?
contractStartDate DateTime
contractEndDate DateTime?
warningStatus WarningStatus @default(NONE)
faceData String? // JSON string containing face descriptor data
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
attendances Attendance[]
salaries Salary[]
employeeAllowances EmployeeAllowance[]

@@map("employees")
}

model Department {
id String @id @default(uuid())
name String @unique
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
employees Employee[]
subDepartments SubDepartment[]
salaryRates SalaryRate[]
allowanceValues AllowanceValue[]

@@map("departments")
}

model SubDepartment {
id String @id @default(uuid())
name String
department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
departmentId String
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
employees Employee[]

@@unique([name, departmentId])
@@map("sub_departments")
}

model Shift {
id String @id @default(uuid())
name String @unique
shiftType ShiftType
mainWorkStart DateTime
mainWorkEnd DateTime
lunchBreakStart DateTime?
lunchBreakEnd DateTime?
overtimeStart DateTime?
overtimeEnd DateTime?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
employees Employee[]

@@map("shifts")
}

model Attendance {
id String @id @default(uuid())
employee Employee @relation(fields: [employeeId], references: [id])
employeeId String
attendanceDate DateTime @default(now())
checkInTime DateTime
checkOutTime DateTime?
mainWorkHours Float?
regularOvertimeHours Float?
weeklyOvertimeHours Float?
status AttendanceStatus
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@map("attendances")
}

model Salary {
id String @id @default(uuid())
employee Employee @relation(fields: [employeeId], references: [id])
employeeId String
periodStart DateTime
periodEnd DateTime
mainWorkHours Float
regularOvertimeHours Float
weeklyOvertimeHours Float
baseSalary Float
overtimeSalary Float
weeklyOvertimeSalary Float
totalAllowances Float
totalSalary Float
paymentStatus PaymentStatus @default(UNPAID)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@map("salaries")
}

model SalaryRate {
id String @id @default(uuid())
contractType ContractType
department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
departmentId String
mainWorkHourRate Float
regularOvertimeRate Float
weeklyOvertimeRate Float
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([contractType, departmentId])
@@map("salary_rates")
}

model AllowanceType {
id String @id @default(uuid())
name String @unique
description String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
allowanceValues AllowanceValue[]

@@map("allowance_types")
}

model AllowanceValue {
id String @id @default(uuid())
allowanceType AllowanceType @relation(fields: [allowanceTypeId], references: [id], onDelete: Cascade)
allowanceTypeId String
department Department @relation(fields: [departmentId], references: [id], onDelete: Cascade)
departmentId String
contractType ContractType
value Float
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
employeeAllowances EmployeeAllowance[]

@@unique([allowanceTypeId, departmentId, contractType])
@@map("allowance_values")
}

model EmployeeAllowance {
id String @id @default(uuid())
employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
employeeId String
allowanceValue AllowanceValue @relation(fields: [allowanceValueId], references: [id], onDelete: Cascade)
allowanceValueId String
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@unique([employeeId, allowanceValueId])
@@map("employee_allowances")
}

model Permission {
id String @id @default(uuid())
user User @relation(fields: [userId], references: [id], onDelete: Cascade)
userId String
type PermissionType
startDate DateTime
endDate DateTime
reason String
status PermissionStatus @default(PENDING)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

@@map("permissions")
}

enum Role {
ADMIN
MANAGER
EMPLOYEE
}

enum ContractType {
PERMANENT
TRAINING
}

enum ShiftType {
NON_SHIFT
SHIFT_A
SHIFT_B
}

enum WarningStatus {
NONE
SP1
SP2
SP3
}

enum AttendanceStatus {
PRESENT
ABSENT
LATE
PERMISSION
}

enum PaymentStatus {
PAID
UNPAID
}

enum PermissionType {
SICK
VACATION
PERSONAL
OTHER
}

enum PermissionStatus {
PENDING
APPROVED
REJECTED
}
