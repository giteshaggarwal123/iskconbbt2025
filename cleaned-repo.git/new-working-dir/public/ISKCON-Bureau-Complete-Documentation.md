
# ISKCON Bureau Management Portal - Complete User Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Authentication & Login](#authentication--login)
3. [Dashboard Module](#dashboard-module)
4. [Meetings Module](#meetings-module)
5. [Documents Module](#documents-module)
6. [Voting Module](#voting-module)
7. [Members Module](#members-module)
8. [Email Module](#email-module)
9. [Attendance Module](#attendance-module)
10. [Reports Module](#reports-module)
11. [Settings Module](#settings-module)
12. [Mobile App Features](#mobile-app-features)

---

## Getting Started

### System Access
- **Web URL:** Access through your web browser
- **Mobile Apps:** Download from Google Play Store (Android) or App Store (iOS)
- **Supported Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### First Time Setup
1. Receive invitation email from administrator
2. Click the registration link
3. Complete profile setup form
4. Verify email address
5. Set up password
6. Access the dashboard

---

## Authentication & Login

### Login Screen Elements

#### Login Form Components:
- **Email Input Field**
  - Placeholder: "Enter your email address"
  - Validation: Email format required
  - Error messages for invalid format

- **Password Input Field**
  - Placeholder: "Enter your password"
  - Show/Hide password toggle button (eye icon)
  - Validation: Minimum 6 characters

- **"Remember Me" Checkbox**
  - Keeps user logged in for 30 days
  - Located below password field

- **"Sign In" Button**
  - Primary blue button
  - Disabled when form is invalid
  - Shows loading spinner during authentication

- **"Forgot Password?" Link**
  - Located below Sign In button
  - Opens password reset dialog
  - Sends reset email to registered address

#### Alternative Login Methods:

- **OTP Login Tab**
  - Switch to phone number authentication
  - Phone number input with country code selector
  - "Send OTP" button
  - 6-digit OTP verification input
  - "Verify OTP" button with countdown timer

- **Microsoft OAuth Button**
  - "Sign in with Microsoft" button
  - Office 365 integration
  - Single Sign-On capability
  - Automatic email sync setup

#### Login Screen Footer:
- **ISKCON Logo** (top left)
- **Application Title:** "ISKCON Bureau Management Portal"
- **Version Information** (bottom)
- **Support Contact** link

---

## Dashboard Module

### Header Section
#### Top Navigation Bar:
- **Application Logo** (clickable - returns to dashboard)
- **Global Search Bar**
  - Magnifying glass icon
  - Placeholder: "Search meetings, documents, members..."
  - Keyboard shortcut: Ctrl+K (Windows) / Cmd+K (Mac)
  - Search results dropdown with categories

- **Notification Bell Icon**
  - Red badge showing unread count
  - Dropdown list of recent notifications
  - "Mark all as read" button
  - "View all notifications" link

- **User Profile Dropdown**
  - User avatar/initials circle
  - User name and email display
  - "Profile Settings" menu item
  - "Account Settings" menu item
  - "Help & Support" menu item
  - "Sign Out" menu item

### Sidebar Navigation
#### Menu Structure:
- **Dashboard** (Home icon) - Currently active page
- **Meetings** (Calendar icon) - Meeting management
- **Documents** (File icon) - Document storage
- **Voting** (Check circle icon) - Polls and voting
- **Attendance** (Clock icon) - Attendance tracking
- **Email** (Mail icon) - Email management
- **Members** (Users icon) - Member management (Admin only)
- **Reports** (Bar chart icon) - Analytics and reports
- **Settings** (Gear icon) - System settings

#### Sidebar Controls:
- **Collapse/Expand Button** (hamburger menu)
- **User Profile Section** (bottom)
  - Avatar image
  - Name and role badge
  - Quick settings access

### Main Dashboard Content

#### Statistics Cards Row:
1. **Total Meetings Card**
   - Large number display
   - Icon: Calendar
   - Color: Blue theme
   - Subtitle: "This month"
   - Click action: Opens Meetings module

2. **Active Polls Card**
   - Large number display
   - Icon: Vote/Check
   - Color: Green theme
   - Subtitle: "Awaiting votes"
   - Click action: Opens Voting module

3. **Documents Uploaded Card**
   - Large number display
   - Icon: File
   - Color: Purple theme
   - Subtitle: "This week"
   - Click action: Opens Documents module

4. **Members Online Card**
   - Large number display
   - Icon: Users
   - Color: Orange theme
   - Subtitle: "Currently active"
   - Click action: Opens Members module

#### Recent Activity Feed:
- **Title:** "Recent Activity"
- **"View All" Button** (top right)
- **Activity Items:**
  - User avatar + action description
  - Timestamp (relative: "2 hours ago")
  - Item type icon (meeting, document, vote, etc.)
  - Click action: Navigate to relevant item

#### Upcoming Events Section:
- **Title:** "Upcoming Events"
- **"View Calendar" Button**
- **Event Cards:**
  - Date and time display
  - Event title and description
  - Attendee count
  - "Join Meeting" button (for online meetings)
  - RSVP status indicator

#### Quick Actions Panel:
- **"Schedule Meeting" Button**
  - Icon: Plus + Calendar
  - Opens meeting creation dialog
  
- **"Upload Document" Button**
  - Icon: Plus + File
  - Opens file upload dialog
  
- **"Create Poll" Button**
  - Icon: Plus + Vote
  - Opens poll creation form
  
- **"Add Member" Button** (Admin only)
  - Icon: Plus + User
  - Opens member invitation form

---

## Meetings Module

### Meeting List View

#### Page Header:
- **Title:** "Meetings" (large, bold)
- **Subtitle:** "Manage and schedule meetings"
- **"Schedule New Meeting" Button** (primary, top right)

#### Filter and Search Bar:
- **Search Input**
  - Placeholder: "Search meetings..."
  - Icon: Magnifying glass
  
- **Date Range Filter**
  - "All Time" dropdown
  - Options: This Week, This Month, Last Month, Custom Range
  
- **Status Filter**
  - "All Status" dropdown
  - Options: Upcoming, In Progress, Completed, Cancelled
  
- **"Reset Filters" Link**

#### Meeting Cards/List:
Each meeting displays:
- **Meeting Title** (large, clickable)
- **Date and Time** with timezone
- **Duration** (e.g., "2 hours")
- **Location/Link** (In-person or Teams link)
- **Organizer Name** with avatar
- **Attendee Count** (e.g., "12/15 attending")
- **Status Badge** (Upcoming/Completed/Cancelled)
- **Actions Dropdown**:
  - "View Details"
  - "Edit Meeting" (if organizer)
  - "Join Meeting" (if active)
  - "Cancel Meeting" (if organizer)
  - "Download Transcript" (if completed)

### Meeting Creation Dialog

#### Basic Information Tab:
- **Meeting Title Input**
  - Required field
  - Character limit: 100
  
- **Description Textarea**
  - Rich text editor
  - Character limit: 500
  
- **Date Picker**
  - Calendar popup
  - Time zone selector
  
- **Start Time Picker**
  - 12/24 hour format toggle
  
- **Duration Selector**
  - Dropdown: 30min, 1hr, 1.5hr, 2hr, Custom
  
- **Location Input**
  - Options: "In Person" or "Microsoft Teams"
  - Address field (if in person)
  - Auto-generate Teams link toggle

#### Attendees Tab:
- **"Add Attendees" Button**
- **Member Search and Select**
  - Searchable member list
  - Checkboxes for selection
  - "Select All" option
  
- **Selected Attendees List**
  - Avatar + Name display
  - Remove button (X)
  - Role indicator (Required/Optional)

#### Agenda Tab:
- **"Add Agenda Item" Button**
- **Agenda Items List**:
  - Item title input
  - Time allocation input
  - Presenter dropdown
  - Up/Down reorder buttons
  - Delete button

#### Settings Tab:
- **RSVP Required** toggle
- **Auto-record Meeting** toggle
- **Enable Transcription** toggle
- **Send Reminders** toggle
  - Reminder timing options: 1 day, 1 hour, 15 minutes before

#### Dialog Footer:
- **"Cancel" Button** (secondary)
- **"Save Draft" Button** (outline)
- **"Schedule Meeting" Button** (primary)

### Meeting Detail View

#### Meeting Header:
- **Back to Meetings** button
- **Meeting Title** (editable if organizer)
- **Edit Meeting** button (if organizer)
- **Meeting Status Badge**

#### Meeting Information Panel:
- **Date and Time** with timezone
- **Duration** display
- **Location/Meeting Link**
- **Organizer** information with avatar
- **Meeting Description**

#### Attendees Section:
- **Total Count** (e.g., "Attendees (12/15)")
- **"Manage Attendees" Button** (if organizer)
- **Attendee List**:
  - Avatar + Name
  - RSVP Status (Yes/No/Maybe/Pending)
  - Attendance Status (Present/Absent) - if meeting completed
  - Contact buttons (Email/Message)

#### Meeting Actions:
- **"Join Meeting" Button** (if active Teams meeting)
- **"Mark Attendance" Button** (if organizer and in progress)
- **"Start Recording" Button** (if in progress)
- **"End Meeting" Button** (if organizer and in progress)

#### Meeting Agenda:
- **Agenda Items List**
  - Time allocation
  - Presenter name
  - Status (Not Started/In Progress/Completed)
  - Notes section (expandable)

#### Meeting History (if completed):
- **Recording Link** (if available)
- **Transcript** (expandable text or download link)
- **Meeting Notes** (collaborative editing)
- **Action Items** (task list with assignments)
- **Attachments** (files shared during meeting)

---

## Documents Module

### Document Library View

#### Page Header:
- **Title:** "Documents"
- **Subtitle:** "Manage and organize files"
- **"Upload Files" Button** (primary, top right)
- **View Toggle** (Grid/List view icons)

#### Toolbar:
- **Search Bar**
  - Placeholder: "Search documents and folders..."
  - Advanced search icon (opens filters)
  
- **New Folder Button**
  - Icon: Folder plus
  
- **Sort Dropdown**
  - Options: Name, Date Modified, Size, Type
  - Ascending/Descending toggle
  
- **Filter Button**
  - Opens filter sidebar
  - Shows active filter count badge

#### Folder Navigation:
- **Breadcrumb Trail**
  - Home > Folder1 > Subfolder
  - Each level clickable
  
- **Back Button** (when in subfolder)
- **Up One Level** button

#### File and Folder Grid/List:

##### Folder Items:
- **Folder Icon** (customizable color)
- **Folder Name** (editable on double-click)
- **Item Count** (e.g., "12 items")
- **Last Modified** date
- **Created By** user info
- **Right-click Context Menu**:
  - "Open"
  - "Rename"
  - "Move to Trash"
  - "Properties"

##### File Items:
- **File Type Icon** (PDF, DOC, IMG, etc.)
- **File Name** (editable)
- **File Size** (formatted: KB, MB, GB)
- **Upload Date**
- **Uploaded By** user avatar
- **Preview Thumbnail** (for images)
- **Right-click Context Menu**:
  - "Open"
  - "Download"
  - "Share"
  - "Rename"
  - "Move"
  - "Copy Link"
  - "View Analytics"
  - "Move to Trash"

#### Selection Mode:
When files/folders are selected:
- **Selection Checkbox** (appears on hover)
- **Bulk Actions Toolbar** (appears at top):
  - "Download Selected"
  - "Move Selected"
  - "Delete Selected"
  - "Share Selected"
  - Selection count display

### File Upload Interface

#### Upload Methods:
1. **Drag and Drop Zone**
   - Large dashed border area
   - "Drag files here or click to browse" text
   - File type restrictions display
   - Maximum size limit info

2. **File Browser Button**
   - "Choose Files" button
   - Multiple file selection support
   - File type filtering

#### Upload Progress:
- **Upload Queue List**
  - File name and size
  - Progress bar with percentage
  - Cancel button for each file
  - Speed indicator (MB/s)
  
- **Overall Progress**
  - "Uploading X of Y files"
  - Total progress bar
  - "Cancel All" button

#### Upload Completion:
- **Success Messages**
  - Green checkmark icons
  - "Upload complete" notification
  
- **Error Handling**
  - Red error icons
  - Error message descriptions
  - "Retry" buttons for failed uploads

### Document Viewer

#### Viewer Header:
- **Close Button** (X) - returns to document list
- **Document Title** (editable if permissions allow)
- **Download Button**
- **Share Button**
- **Print Button** (for PDFs)
- **Full Screen Toggle**

#### Viewer Controls:
For PDFs:
- **Page Navigation**
  - Previous/Next page arrows
  - Page number input (e.g., "5 of 20")
  - Jump to page dropdown
  
- **Zoom Controls**
  - Zoom percentage display
  - Zoom in/out buttons
  - Fit to width/page buttons
  
- **Search within Document**
  - Search input field
  - Find next/previous buttons
  - Match count display

For Images:
- **Zoom Controls**
- **Rotate Buttons** (90° increments)
- **Pan and Zoom** (mouse/touch)

#### Document Information Panel:
- **File Details**
  - File size and type
  - Upload date and uploader
  - Last modified information
  - Download count
  
- **Analytics Section** (if enabled)
  - View count
  - Unique viewers
  - Average viewing time
  - Most viewed pages (for PDFs)

#### Comments and Annotations:
- **Comments Sidebar**
  - Add comment button
  - Comment threads
  - Reply functionality
  - User avatars and timestamps
  
- **Annotation Tools** (for PDFs)
  - Highlight tool
  - Note tool
  - Drawing tool
  - Save annotations button

---

## Voting Module

### Polls List View

#### Page Header:
- **Title:** "Voting & Polls"
- **Subtitle:** "Participate in democratic decisions"
- **"Create New Poll" Button** (primary, top right)

#### Filter Tabs:
- **"Active" Tab** (default)
  - Shows open polls awaiting votes
  - Badge with count of active polls
  
- **"Completed" Tab**
  - Shows finished polls with results
  - Badge with count
  
- **"My Polls" Tab**
  - Shows polls created by current user
  - Badge with count

#### Poll Cards:
Each poll displays:
- **Poll Title** (large, clickable)
- **Poll Description** (truncated, expandable)
- **Status Badge** (Active/Completed/Cancelled)
- **Deadline Information**
  - For active: "Ends in 2 days"
  - For completed: "Ended on [date]"
  
- **Participation Statistics**
  - "12/25 members voted" progress bar
  - Percentage completion
  
- **Poll Type Indicator**
  - Single choice, Multiple choice, Yes/No icons
  
- **Action Buttons**
  - "Vote Now" (if not voted and active)
  - "View Results" (if voted or completed)
  - "Edit Poll" (if creator and active)
  - "Cancel Poll" (if creator and active)

### Poll Creation Dialog

#### Poll Information Tab:
- **Poll Title Input**
  - Required field
  - Character limit display
  
- **Poll Description**
  - Rich text editor
  - Optional field
  - Character limit: 1000
  
- **Poll Type Selection**
  - Radio buttons:
    - "Single Choice" (select one option)
    - "Multiple Choice" (select multiple)
    - "Yes/No" (simple binary choice)
  
- **Deadline Settings**
  - Date picker
  - Time picker
  - Timezone display

#### Questions and Options Tab:
- **Main Question Input**
  - Large text field
  - Required
  
- **Answer Options Section**
  - "Add Option" button
  - **Option List**:
    - Option text input
    - Delete option button (X)
    - Reorder handles (drag/drop)
    - Minimum 2 options required

#### Poll Settings Tab:
- **Voting Settings**
  - "Anonymous Voting" toggle
  - "Show Results Before Voting" toggle
  - "Allow Vote Changes" toggle
  
- **Notification Settings**
  - "Notify All Members" toggle
  - "Send Reminder Notifications" toggle
  - Reminder schedule dropdown
  
- **Attachment Section**
  - "Attach Supporting Documents" area
  - File upload zone
  - Attached files list with remove buttons

#### Dialog Footer:
- **"Cancel" Button**
- **"Save as Draft" Button**
- **"Publish Poll" Button** (primary)

### Voting Interface

#### Poll Header:
- **Back to Polls** button
- **Poll Title** (large)
- **Poll Status** and deadline info
- **Creator Information** with avatar

#### Poll Content:
- **Poll Description** (if provided)
- **Attached Documents** (downloadable links)
- **Main Question** (prominent display)

#### Voting Options:
For Single/Multiple Choice:
- **Option Cards/Buttons**
  - Radio buttons (single choice)
  - Checkboxes (multiple choice)
  - Option text
  - Vote count (if results shown)
  - Percentage bar (if results shown)

For Yes/No:
- **Large Yes/No Buttons**
  - Green "Yes" button
  - Red "No" button
  - Vote counts if results visible

#### Voting Actions:
- **"Submit Vote" Button** (primary, disabled until selection made)
- **"Change Vote" Button** (if allowed and already voted)
- **Progress Indicator** showing voting progress

#### Results Display (after voting):
- **Vote Confirmation** message
- **Results Chart** (pie chart or bar chart)
- **Detailed Statistics**
  - Total votes cast
  - Breakdown by option
  - Participation percentage
  
- **Comments Section**
  - Add comment input
  - Comment thread display
  - User avatars and timestamps

---

## Members Module

### Members Directory

#### Page Header:
- **Title:** "Members"
- **Subtitle:** "Manage organization members"
- **"Add New Member" Button** (primary, admin only)
- **"Export Members" Button** (secondary, admin only)

#### Search and Filter Bar:
- **Search Input**
  - Placeholder: "Search members by name or email..."
  - Real-time search results
  
- **Role Filter Dropdown**
  - "All Roles" (default)
  - Admin
  - Member
  - Custom roles
  
- **Status Filter**
  - "All Status"
  - Active
  - Inactive
  - Pending Invitation
  
- **"Advanced Filters" Button**
  - Opens filter sidebar
  - Join date range
  - Last activity date
  - Department/Group filters

#### Members Grid/List View:

##### Member Cards (Grid View):
- **Profile Avatar** (large, with initials if no photo)
- **Member Name** (clickable)
- **Email Address**
- **Role Badge** (colored by role type)
- **Status Indicator** (green dot for active)
- **Last Activity** timestamp
- **Quick Actions Buttons**:
  - "Send Message" (envelope icon)
  - "View Profile" (eye icon)
  - "Edit Member" (pencil icon, admin only)

##### Member List (List View):
- **Checkbox** for bulk selection
- **Avatar** (small)
- **Name and Email** (stacked)
- **Role** column
- **Join Date** column
- **Last Activity** column
- **Status** column with colored badges
- **Actions** dropdown per row

#### Bulk Actions (when members selected):
- **Selection Counter** (e.g., "3 members selected")
- **"Send Message to Selected"**
- **"Export Selected"**
- **"Change Role"** (admin only)
- **"Deactivate Selected"** (admin only)

### Member Profile View

#### Profile Header:
- **Back to Members** button
- **Large Profile Avatar**
- **Member Name** (large, editable if self or admin)
- **Role Badge** and permissions level
- **Member Status** (Active/Inactive/Pending)
- **"Edit Profile" Button** (if self or admin)

#### Profile Information Tabs:

##### Personal Information Tab:
- **Basic Details Section**:
  - First Name (editable field)
  - Last Name (editable field)
  - Email Address (display only)
  - Phone Number (editable)
  - Date of Birth (editable)
  
- **Address Information**:
  - Street Address
  - City, State, ZIP
  - Country dropdown
  
- **Emergency Contact** (optional):
  - Contact Name
  - Relationship
  - Phone Number

##### Activity & Engagement Tab:
- **Engagement Statistics**:
  - "Member Since" date
  - "Last Active" timestamp
  - "Total Login Count"
  
- **Module Usage Statistics**:
  - Meetings attended count
  - Documents accessed count
  - Votes participated count
  - Email activity summary
  
- **Recent Activity Timeline**:
  - Chronological activity list
  - Activity type icons
  - Timestamps
  - Activity descriptions

##### Permissions & Settings Tab:
- **Role Management** (admin only):
  - Current role display
  - "Change Role" dropdown
  - Custom permissions checkboxes
  
- **Account Settings**:
  - "Account Status" toggle (admin only)
  - "Email Notifications" toggle
  - "SMS Notifications" toggle
  - "Push Notifications" toggle
  
- **Privacy Settings**:
  - "Profile Visibility" options
  - "Activity Status Sharing" toggle
  - "Contact Information Sharing" toggle

#### Profile Actions Panel:
- **Communication Buttons**:
  - "Send Email" button
  - "Send Message" button
  - "Schedule Meeting" button
  
- **Administrative Actions** (admin only):
  - "Reset Password" button
  - "Download Member Data" button
  - "Deactivate Account" button (with confirmation)
  - "Delete Member" button (with strong confirmation)

### Add/Edit Member Dialog

#### Member Information Tab:
- **Profile Photo Upload**
  - Drag/drop or click to upload
  - Image preview with crop tool
  - "Remove Photo" option
  
- **Required Fields**:
  - First Name input (required)
  - Last Name input (required)
  - Email Address input (required, unique)
  - Initial Password input (for new members)
  
- **Optional Fields**:
  - Phone Number input
  - Date of Birth picker
  - Department/Group dropdown

#### Role Assignment Tab:
- **Role Selection**:
  - Radio buttons for predefined roles
  - "Custom Role" option
  
- **Permission Matrix** (if custom role):
  - Module access checkboxes
  - Permission level dropdowns
  - Preview of effective permissions

#### Invitation Settings Tab (for new members):
- **Invitation Method**:
  - "Send Email Invitation" (default)
  - "Send SMS Invitation"
  - "Generate Invitation Link"
  
- **Welcome Message**:
  - Customizable invitation email
  - Template variables available
  - Preview option

#### Dialog Footer:
- **"Cancel" Button**
- **"Save Member" Button** (for edits)
- **"Send Invitation" Button** (for new members)

---

## Email Module

### Email Inbox View

#### Page Header:
- **Title:** "Email"
- **Subtitle:** "Manage your communications"
- **"Compose Email" Button** (primary, top right)
- **"Refresh" Button** with loading indicator

#### Email Toolbar:
- **Search Bar**
  - Placeholder: "Search in mail"
  - Search icon
  - Advanced search options
  
- **Filter Dropdown**
  - "All Mail" (default)
  - "Unread"
  - "Important"
  - "With Attachments"
  
- **Sort Options**
  - "Newest First" (default)
  - "Oldest First"
  - "Sender A-Z"

#### Email List:
Each email displays:
- **Unread Indicator** (blue dot for unread emails)
- **Sender Avatar** and name
- **Email Subject** (bold if unread)
- **Email Preview** (first line of content)
- **Timestamp** (relative: "2 hours ago" or absolute date)
- **Attachment Icon** (paperclip if has attachments)
- **Importance Flag** (star icon for high priority)
- **Actions** (appear on hover):
  - "Mark as Read/Unread" toggle
  - "Archive" button
  - "Delete" button

#### Email Actions Bar (when emails selected):
- **Selection Count** (e.g., "5 emails selected")
- **"Mark as Read" Button**
- **"Archive Selected" Button**
- **"Delete Selected" Button**
- **"Mark Important" Button**

### Email Detail View

#### Email Header:
- **Back to Inbox** button
- **Subject Line** (large, bold)
- **Sender Information**:
  - Sender avatar and name
  - Email address
  - Timestamp (full date and time)
  
- **Recipient Information**:
  - "To:" field with recipient list
  - "CC:" field (if applicable)
  - "BCC:" field (if applicable, and user was sender)

#### Email Actions:
- **Reply Button** (primary)
- **Reply All Button** (if multiple recipients)
- **Forward Button**
- **Print Button**
- **Download Attachments** (if present)
- **Mark Important** toggle (star icon)
- **Delete Button** (trash icon)

#### Email Content:
- **Email Body** (formatted text display)
- **Inline Images** (if present)
- **Quoted Text** (expandable for reply chains)

#### Attachments Section (if present):
- **Attachment List**:
  - File icon (by type)
  - File name
  - File size
  - "Download" button
  - "Preview" button (for supported types)

### Email Composition

#### Compose Dialog Header:
- **"New Message" Title**
- **Minimize Button** (to continue composing later)
- **Close Button** (with save draft prompt)

#### Compose Fields:
- **To Field**:
  - Email address input with autocomplete
  - Contact suggestions from organization
  - "Add CC" and "Add BCC" links
  
- **Subject Field**:
  - Single line input
  - Character counter
  
- **Message Body**:
  - Rich text editor with formatting toolbar:
    - Bold, Italic, Underline buttons
    - Font size and color selectors
    - Bullet and numbered lists
    - Link insertion
    - Image insertion
    - Text alignment options

#### Attachment Section:
- **"Attach Files" Button**
- **Drag and Drop Zone**
- **Attached Files List**:
  - File name and size
  - Remove button (X)
  - Upload progress (if uploading)

#### Send Options:
- **"Send Now" Button** (primary)
- **"Schedule Send" Dropdown**:
  - "Send in 1 hour"
  - "Send tomorrow morning"
  - "Custom date/time" picker
  
- **"Save as Draft" Button**
- **"Discard" Button**

---

## Attendance Module

### Attendance Dashboard

#### Page Header:
- **Title:** "Attendance Management"
- **Subtitle:** "Track and manage event attendance"
- **"Create Check-in Event" Button** (primary, top right)

#### Quick Stats Cards:
1. **Today's Events Card**
   - Number of events today
   - Click to view today's schedule
   
2. **Active Check-ins Card**
   - Currently running events
   - Real-time attendance count
   
3. **This Week's Attendance Card**
   - Total attendance this week
   - Comparison with last week
   
4. **Average Attendance Rate Card**
   - Percentage with trend indicator

#### Recent Events List:
- **Event Name** and description
- **Date and Time**
- **Attendance Count** (e.g., "45/60 attended")
- **Attendance Rate** percentage with progress bar
- **Status Badge** (Scheduled/Active/Completed)
- **Quick Actions**:
  - "View Details"
  - "Export Attendance"
  - "Generate Report"

### Check-in Event Creation

#### Event Details Tab:
- **Event Name Input** (required)
- **Event Description** (optional)
- **Event Date Picker**
- **Start Time** and **End Time** selectors
- **Location Input** (physical address or "Virtual")
- **Expected Attendee Count** (for capacity planning)

#### Check-in Settings Tab:
- **Check-in Method Selection**:
  - Manual check-in (admin marks attendance)
  - Self check-in (members check themselves in)
  - QR code check-in
  - Hybrid (multiple methods)
  
- **Check-in Window**:
  - Start time (before event start)
  - End time (after event start)
  - Late arrival grace period
  
- **Required Information**:
  - Name verification
  - Contact information update
  - Health screening questions (if applicable)

#### Attendee Management Tab:
- **Pre-registration Settings**:
  - "Require Pre-registration" toggle
  - "Allow Walk-ins" toggle
  - "Capacity Limit" input
  
- **Invited Attendees**:
  - Member selection interface
  - "Invite All Members" option
  - Custom invitation groups

### Live Check-in Interface

#### Event Header:
- **Event Name** and details
- **Current Time** and event status
- **Total Checked In** counter (large, prominent)
- **Capacity Indicator** (e.g., "78/100")

#### Check-in Methods:

##### Manual Check-in:
- **Member Search Bar**
  - Real-time search as you type
  - Member suggestions with photos
  
- **Member Selection**:
  - Click to select member
  - Confirmation dialog with member details
  - "Check In" button
  
- **Quick Check-in List**:
  - Pre-loaded expected attendees
  - Checkboxes for quick marking
  - "Check In Selected" bulk action

##### QR Code Check-in:
- **QR Code Display** (large, centered)
- **QR Code Scanner** (for mobile devices)
- **Manual Code Entry** fallback
- **Success/Error Messages**

##### Self Check-in Interface:
- **Member Login/Selection**
- **Verification Step** (confirm identity)
- **Additional Information** (if required)
- **"Check In" Confirmation** button

#### Real-time Attendance List:
- **Recently Checked In** section
- **Member avatars** and names
- **Check-in timestamps**
- **Late arrival indicators**
- **Check-out option** (if enabled)

### Attendance Reports

#### Report Generation Interface:
- **Report Type Selection**:
  - Single event report
  - Date range report
  - Member attendance history
  - Attendance trends analysis
  
- **Date Range Picker**
- **Event Filter** (all events or specific events)
- **Member Filter** (all members or specific groups)
- **Export Format Selection** (PDF, Excel, CSV)

#### Report Preview:
- **Summary Statistics**
- **Attendance Charts and Graphs**
- **Detailed Attendance Lists**
- **Trend Analysis** (if applicable)
- **Export Options**

---

## Reports Module

### Reports Dashboard

#### Page Header:
- **Title:** "Reports & Analytics"
- **Subtitle:** "Generate comprehensive reports"
- **"Generate New Report" Button** (primary)

#### Quick Stats Overview:
Row of cards showing:
- **Total Meetings** this period
- **Documents** uploaded count
- **Document Views** analytics
- **Active Members** count

#### Report Categories:

##### Pre-built Reports Section:
- **Meetings Report Card**:
  - Description: "Meeting attendance and participation"
  - "Generate" button
  - Last generated timestamp
  
- **Documents Analytics Card**:
  - Description: "Document usage and engagement"
  - "Generate" button
  - Last generated timestamp
  
- **Voting Participation Card**:
  - Description: "Poll participation and results"
  - "Generate" button
  - Last generated timestamp
  
- **Member Engagement Card**:
  - Description: "Member activity and statistics"
  - "Generate" button
  - Last generated timestamp

##### Custom Reports Section:
- **Report Builder** interface
- **Saved Custom Reports** list
- **"Create Custom Report" Button**

### Report Generation Interface

#### Report Configuration:
- **Report Type Dropdown**:
  - Meetings Report
  - Documents Report
  - Document Analytics Report
  - Voting Report
  - Members Report
  - Comprehensive Report
  
- **Date Range Selection**:
  - Start Date picker
  - End Date picker
  - Quick options: This Week, This Month, Last Month, This Year
  
- **Filters and Parameters**:
  - Member groups (if applicable)
  - Specific events (if applicable)
  - Data granularity options

#### Generation Controls:
- **Preview Options**:
  - "Preview Report" button
  - Sample data display
  
- **Export Format Selection**:
  - "Download CSV" button
  - "Download PDF" button
  - Format-specific options

#### Report Preview Area:
- **Report Title** and metadata
- **Executive Summary** section
- **Charts and Visualizations**
- **Data Tables**
- **Conclusions and Recommendations**

---

## Settings Module

### Settings Navigation Tabs:
- **Profile Tab** (User icon)
- **Integrations Tab** (Plug icon)
- **Notifications Tab** (Bell icon)
- **Privacy Tab** (Shield icon)

### Profile Settings Tab

#### Profile Information Section:
- **Profile Photo Management**:
  - Current avatar display (large)
  - "Upload New Photo" button
  - "Remove Photo" option
  - Photo preview and crop tool
  
- **Basic Information Form**:
  - First Name input (editable)
  - Last Name input (editable)
  - Email display (read-only)
  - Phone Number input (editable)
  - Role badge display (read-only)

#### Account Information:
- **Account Status** indicator
- **Member Since** date
- **Last Login** timestamp
- **Account Type** (if applicable)

#### Profile Actions:
- **"Edit Profile" Button** (toggles edit mode)
- **"Save Changes" Button** (in edit mode)
- **"Cancel" Button** (in edit mode)
- **"Change Password" Button** (opens dialog)

### Integrations Settings Tab

#### Microsoft 365 Integration Card:
- **Connection Status** indicator (Connected/Disconnected)
- **Account Information** (if connected):
  - Connected email address
  - Connection date
  - Last sync timestamp
  
- **Available Features** list:
  - Email synchronization
  - Calendar integration
  - Teams meeting creation
  - Document sharing
  
- **Action Buttons**:
  - "Connect to Microsoft" (if not connected)
  - "Refresh Connection" (if connected)
  - "Disconnect" (if connected, with confirmation)

#### Integration Settings:
- **Auto-sync Settings**:
  - "Enable Email Sync" toggle
  - "Sync Frequency" dropdown
  - "Sync Calendar Events" toggle
  
- **Permissions Review**:
  - List of granted permissions
  - "Review Permissions" button
  - "Revoke Access" option

### Notifications Settings Tab

#### Email Notifications Section:
- **Meeting Notifications**:
  - "Meeting Invitations" toggle
  - "Meeting Reminders" toggle
  - "Meeting Updates" toggle
  
- **Document Notifications**:
  - "New Document Uploads" toggle
  - "Document Shares" toggle
  - "Document Comments" toggle
  
- **Voting Notifications**:
  - "New Poll Created" toggle
  - "Poll Deadline Reminders" toggle
  - "Poll Results" toggle

#### Push Notifications Section:
- **Enable Push Notifications** master toggle
- **Notification Categories**:
  - Urgent notifications toggle
  - Meeting reminders toggle
  - Message notifications toggle
  - System updates toggle
  
- **Quiet Hours Settings**:
  - "Enable Quiet Hours" toggle
  - Start time picker
  - End time picker
  - Weekend settings

#### Notification Preferences:
- **Notification Frequency**:
  - Immediate
  - Hourly digest
  - Daily digest
  - Weekly digest
  
- **Notification Format**:
  - Full details
  - Summary only
  - Title only

### Privacy Settings Tab

#### Privacy Controls:
- **Profile Visibility**:
  - "Make profile visible to other members" toggle
  - Visibility level dropdown (All Members/Admins Only/Private)
  
- **Activity Status**:
  - "Show when you're online" toggle
  - "Share last activity timestamp" toggle
  
- **Data Analytics**:
  - "Help improve the platform with usage data" toggle
  - "Allow anonymous analytics" toggle

#### Data Management:
- **Personal Data**:
  - "Download My Data" button
  - "Delete My Account" button (with strong confirmation)
  - Data retention policy display
  
- **Cookie Preferences**:
  - Essential cookies (always on)
  - Analytics cookies toggle
  - Marketing cookies toggle

---

## Mobile App Features

### Mobile-Specific Interface Elements

#### Navigation:
- **Top Header Bar**:
  - Hamburger menu (left)
  - App title (center)
  - Profile/notifications (right)
  
- **Bottom Navigation Bar**:
  - 5 main module icons
  - Active state indicators
  - Badge counts for notifications
  - Touch-optimized tap targets

#### Mobile Gestures:
- **Pull-to-Refresh**: Update data in any list view
- **Swipe Actions**: Quick actions on list items
- **Long Press**: Context menus and selection mode
- **Pinch to Zoom**: Document viewer and images
- **Swipe Navigation**: Between tabs and pages

### Native Mobile Features

#### Push Notifications:
- **Notification Permission** prompt on first launch
- **Rich Notifications** with action buttons
- **Notification Categories** for different types
- **Badge App Icon** with unread counts
- **Notification History** in notification center

#### Device Integration:
- **Camera Access**:
  - Document scanning for uploads
  - Profile photo capture
  - QR code scanning for check-ins
  
- **File System Access**:
  - Download documents to device
  - Upload files from device storage
  - Share documents to other apps
  
- **Contact Integration**:
  - Access device contacts for member invitations
  - Export member information to contacts
  
- **Biometric Authentication**:
  - Fingerprint unlock
  - Face ID unlock (iOS)
  - PIN/Pattern fallback

#### Offline Capabilities:
- **Cached Data**: Recently viewed content available offline
- **Offline Reading**: Downloaded documents readable without internet
- **Sync Queue**: Actions performed offline sync when connection returns
- **Offline Indicators**: Clear indication when offline

### Mobile-Optimized Interfaces

#### Touch-Friendly Design:
- **Large Tap Targets**: Minimum 44px touch targets
- **Thumb-Friendly Navigation**: Bottom navigation for easy reach
- **Swipe-Friendly Lists**: Easy left/right swipe actions
- **Touch Feedback**: Haptic feedback for interactions

#### Mobile Form Optimization:
- **Mobile Keyboards**: Appropriate keyboard types for inputs
- **Input Validation**: Real-time validation feedback
- **Form Progress**: Progress indicators for multi-step forms
- **Auto-focus**: Automatic focus management

#### Responsive Layout Adaptations:
- **Single Column Layout**: Optimized for narrow screens
- **Collapsible Sections**: Expandable content areas
- **Modal Dialogs**: Full-screen dialogs on mobile
- **Contextual Actions**: Context-sensitive action buttons

### Performance Optimizations

#### Loading and Performance:
- **Progressive Loading**: Content loads as needed
- **Image Optimization**: Automatic image compression
- **Lazy Loading**: Images and content load on scroll
- **Caching Strategy**: Intelligent content caching

#### Battery and Data Optimization:
- **Background Sync**: Efficient background data updates
- **Data Usage Controls**: Options to limit data usage
- **Battery Optimization**: Reduced background activity
- **Offline-First**: Prioritize offline functionality

---

## Troubleshooting and Support

### Common Issues and Solutions

#### Login Problems:
- **"Invalid Credentials" Error**:
  - Verify email address spelling
  - Check caps lock status
  - Use password reset if needed
  
- **"Account Not Found" Error**:
  - Contact administrator for account setup
  - Check if invitation email was received
  
- **Two-Factor Authentication Issues**:
  - Verify authenticator app time sync
  - Use backup codes if available
  - Contact support for reset

#### Performance Issues:
- **Slow Loading**:
  - Check internet connection
  - Clear browser cache
  - Close unnecessary browser tabs
  
- **Mobile App Crashes**:
  - Force close and restart app
  - Update to latest app version
  - Restart device if needed

#### Feature Access Issues:
- **Missing Menu Items**:
  - Contact administrator about permissions
  - Verify user role assignments
  - Check if features are enabled for organization

### Getting Help

#### In-App Support:
- **Help Button** in user menu
- **Context-Sensitive Help** tooltips
- **Feature Tours** for new users
- **FAQ Section** with common questions

#### Contact Support:
- **Support Ticket System** through settings
- **Email Support** with automatic issue categorization
- **Live Chat** during business hours
- **Video Call Support** for complex issues

---

*This documentation covers all major features and interfaces of the ISKCON Bureau Management Portal. For additional help or feature requests, please contact your system administrator or use the built-in support features.*

**Document Version:** 1.0  
**Last Updated:** [Current Date]  
**Platform Version:** Current Release
