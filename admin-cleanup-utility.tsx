-- Add this to your AdminDashboard component or create a separate cleanup page

// Add this function to your AdminDashboard component
const cleanupLegacyData = async () => {
  try {
    // Get all users with their roles
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .order('created_at')

    if (usersError) throw usersError

    // Show users that will be cleaned up
    const nonDrivers = users?.filter(u => u.role !== 'driver') || []
    
    if (nonDrivers.length === 0) {
      toast.success('No legacy data found!')
      return
    }

    // Confirm cleanup
    const confirmed = confirm(
      `Found ${nonDrivers.length} non-driver users:\n` +
      nonDrivers.map(u => `- ${u.name} (${u.email}) - ${u.role}`).join('\n') +
      '\n\nThis will remove all their earnings, expenses, and attendance records. Continue?`
    )

    if (!confirmed) return

    // Clean up earnings
    const { error: earningsError } = await supabase
      .from('driver_earnings')
      .delete()
      .in('driver_id', nonDrivers.map(u => u.id))

    if (earningsError) throw earningsError

    // Clean up expenses
    const { error: expensesError } = await supabase
      .from('driver_expenses')
      .delete()
      .in('driver_id', nonDrivers.map(u => u.id))

    if (expensesError) throw expensesError

    // Clean up attendance
    const { error: attendanceError } = await supabase
      .from('attendance')
      .delete()
      .in('driver_id', nonDrivers.map(u => u.id))

    if (attendanceError) throw attendanceError

    toast.success(`Cleaned up data for ${nonDrivers.length} non-driver users`)
    
    // Refresh the dashboard
    fetchData()
    
  } catch (error) {
    console.error('Cleanup error:', error)
    toast.error('Failed to cleanup legacy data')
  }
}

// Add this button to your admin dashboard
<Button 
  onClick={cleanupLegacyData}
  variant="destructive"
  className="mb-4"
>
  Clean Up Legacy Data
</Button>
