const fetchCurrentEmployeeInfo = async () => {
  try {
    const response = await fetch('/api/employees/current-employee');

    if (!response.ok) {
      throw new Error('Gagal mendapatkan informasi karyawan');
    }

    const data = await response.json();

    if (data.employee) {
      setEmployeeInfo({
        id: data.employee.id,
        name: data.employee.user.name,
        department: data.employee.department.name,
        shift: data.employee.shift.name
      });

      // Cek apakah karyawan sudah melakukan presensi hari ini
      const hasCheckedInToday = data.employee.todayAttendance && data.employee.todayAttendance.checkInTime;
      setIsCheckedIn(hasCheckedInToday);
    }
  } catch (error) {
    console.error('Error fetching employee info:', error);
    // Data dummy untuk testing
    setEmployeeInfo({
      id: "EMP001",
      name: "Budi Santoso",
      department: "IT",
      shift: "Shift A"
    });

    // Cek data dummy attendance untuk melihat apakah karyawan sudah absen
    const userAttendance = attendanceData.find(att => att.employeeId === "EMP001");
    setIsCheckedIn(!!userAttendance);
  }
}; 