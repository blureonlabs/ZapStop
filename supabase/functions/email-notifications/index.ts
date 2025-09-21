import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailNotification {
  to: string | string[]
  subject: string
  template: 'expense_approval' | 'expense_rejection' | 'leave_approval' | 'leave_rejection' | 'daily_summary' | 'custom'
  data?: Record<string, any>
  html?: string
  text?: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get request body
    const { to, subject, template, data = {}, html, text }: EmailNotification = await req.json()

    if (!to || !subject) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to and subject are required' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Generate email content based on template
    let emailHtml = html
    let emailText = text

    if (template === 'expense_approval') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Expense Approved</h2>
          <p>Hello ${data.driver_name || 'Driver'},</p>
          <p>Your expense submission has been approved.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Expense Details:</strong></p>
            <p>Type: ${data.expense_type || 'N/A'}</p>
            <p>Amount: $${data.amount || '0.00'}</p>
            <p>Date: ${data.date || 'N/A'}</p>
            <p>Description: ${data.description || 'N/A'}</p>
          </div>
          <p>Thank you for your submission.</p>
          <p>Best regards,<br>Zap Stop Management</p>
        </div>
      `
      emailText = `Hello ${data.driver_name || 'Driver'},\n\nYour expense submission has been approved.\n\nExpense Details:\nType: ${data.expense_type || 'N/A'}\nAmount: $${data.amount || '0.00'}\nDate: ${data.date || 'N/A'}\nDescription: ${data.description || 'N/A'}\n\nThank you for your submission.\n\nBest regards,\nZap Stop Management`
    }

    if (template === 'expense_rejection') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Expense Rejected</h2>
          <p>Hello ${data.driver_name || 'Driver'},</p>
          <p>Your expense submission has been rejected.</p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Expense Details:</strong></p>
            <p>Type: ${data.expense_type || 'N/A'}</p>
            <p>Amount: $${data.amount || '0.00'}</p>
            <p>Date: ${data.date || 'N/A'}</p>
            <p>Description: ${data.description || 'N/A'}</p>
            <p><strong>Reason for Rejection:</strong> ${data.reason || 'Please contact management for details.'}</p>
          </div>
          <p>Please review and resubmit if necessary.</p>
          <p>Best regards,<br>Zap Stop Management</p>
        </div>
      `
      emailText = `Hello ${data.driver_name || 'Driver'},\n\nYour expense submission has been rejected.\n\nExpense Details:\nType: ${data.expense_type || 'N/A'}\nAmount: $${data.amount || '0.00'}\nDate: ${data.date || 'N/A'}\nDescription: ${data.description || 'N/A'}\n\nReason for Rejection: ${data.reason || 'Please contact management for details.'}\n\nPlease review and resubmit if necessary.\n\nBest regards,\nZap Stop Management`
    }

    if (template === 'leave_approval') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Leave Request Approved</h2>
          <p>Hello ${data.driver_name || 'Driver'},</p>
          <p>Your leave request has been approved.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Leave Details:</strong></p>
            <p>Type: ${data.leave_type || 'N/A'}</p>
            <p>Start Date: ${data.start_date || 'N/A'}</p>
            <p>End Date: ${data.end_date || 'N/A'}</p>
            <p>Reason: ${data.reason || 'N/A'}</p>
          </div>
          <p>Enjoy your time off!</p>
          <p>Best regards,<br>Zap Stop Management</p>
        </div>
      `
      emailText = `Hello ${data.driver_name || 'Driver'},\n\nYour leave request has been approved.\n\nLeave Details:\nType: ${data.leave_type || 'N/A'}\nStart Date: ${data.start_date || 'N/A'}\nEnd Date: ${data.end_date || 'N/A'}\nReason: ${data.reason || 'N/A'}\n\nEnjoy your time off!\n\nBest regards,\nZap Stop Management`
    }

    if (template === 'leave_rejection') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Leave Request Rejected</h2>
          <p>Hello ${data.driver_name || 'Driver'},</p>
          <p>Your leave request has been rejected.</p>
          <div style="background: #fef2f2; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Leave Details:</strong></p>
            <p>Type: ${data.leave_type || 'N/A'}</p>
            <p>Start Date: ${data.start_date || 'N/A'}</p>
            <p>End Date: ${data.end_date || 'N/A'}</p>
            <p>Reason: ${data.reason || 'N/A'}</p>
            <p><strong>Reason for Rejection:</strong> ${data.rejection_reason || 'Please contact management for details.'}</p>
          </div>
          <p>Please submit a new request if needed.</p>
          <p>Best regards,<br>Zap Stop Management</p>
        </div>
      `
      emailText = `Hello ${data.driver_name || 'Driver'},\n\nYour leave request has been rejected.\n\nLeave Details:\nType: ${data.leave_type || 'N/A'}\nStart Date: ${data.start_date || 'N/A'}\nEnd Date: ${data.end_date || 'N/A'}\nReason: ${data.reason || 'N/A'}\n\nReason for Rejection: ${data.rejection_reason || 'Please contact management for details.'}\n\nPlease submit a new request if needed.\n\nBest regards,\nZap Stop Management`
    }

    if (template === 'daily_summary') {
      emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Daily Summary - ${data.date || new Date().toLocaleDateString()}</h2>
          <p>Hello ${data.driver_name || 'Driver'},</p>
          <p>Here's your daily summary:</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Earnings:</strong></p>
            <p>Uber: $${data.uber_earnings || '0.00'}</p>
            <p>Bolt: $${data.bolt_earnings || '0.00'}</p>
            <p>Individual: $${data.individual_earnings || '0.00'}</p>
            <p><strong>Total: $${data.total_earnings || '0.00'}</strong></p>
            <br>
            <p><strong>Work Hours:</strong></p>
            <p>Start Time: ${data.start_time || 'N/A'}</p>
            <p>End Time: ${data.end_time || 'Still Working'}</p>
            <p>Duration: ${data.duration || 'N/A'}</p>
          </div>
          <p>Keep up the great work!</p>
          <p>Best regards,<br>Zap Stop Management</p>
        </div>
      `
      emailText = `Hello ${data.driver_name || 'Driver'},\n\nHere's your daily summary for ${data.date || new Date().toLocaleDateString()}:\n\nEarnings:\nUber: $${data.uber_earnings || '0.00'}\nBolt: $${data.bolt_earnings || '0.00'}\nIndividual: $${data.individual_earnings || '0.00'}\nTotal: $${data.total_earnings || '0.00'}\n\nWork Hours:\nStart Time: ${data.start_time || 'N/A'}\nEnd Time: ${data.end_time || 'Still Working'}\nDuration: ${data.duration || 'N/A'}\n\nKeep up the great work!\n\nBest regards,\nZap Stop Management`
    }

    // For custom template, use provided html/text or fallback
    if (template === 'custom') {
      emailHtml = html || '<p>Custom notification</p>'
      emailText = text || 'Custom notification'
    }

    // In a real implementation, you would integrate with an email service like:
    // - Resend
    // - SendGrid
    // - AWS SES
    // - Nodemailer with SMTP
    
    // For now, we'll simulate sending the email
    console.log('Email notification:', {
      to,
      subject,
      template,
      data,
      html: emailHtml,
      text: emailText
    })

    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100))

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email notification sent successfully',
        details: {
          to: Array.isArray(to) ? to : [to],
          subject,
          template,
          sent_at: new Date().toISOString()
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in email-notifications:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
