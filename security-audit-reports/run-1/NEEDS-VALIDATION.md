# Needs Validation Candidates

## Candidate: [farmwise-2026-rtdb-rules-untracked]
**Title**: Untracked Firebase Realtime Database Security Rules for User Multi-Tenant Data  

### 1. Ordered Repository-Relative Trace & Evidence
- **Entrypoint**: [src/services/firebase.js:19](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/src/services/firebase.js#L19)
  - Exports `rtdb = getDatabase(app)` connected to `https://farmwise-be0bd-default-rtdb.asia-southeast1.firebasedatabase.app`.
- **Propagation**: [src/services/authService.js:84](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/src/services/authService.js#L84)
  - Directly updates user profile node: `set(ref(db, 'users/' + uid), profileData)`.
- **Sink**: [src/services/farmService.js:35](file:///c:/Users/ganga/OneDrive/Desktop/farmwise/src/services/farmService.js#L35)
  - Reads and synchronizes farm plots: `ref(rtdb, 'users/' + uid)`.

### 2. Claimed Root Cause & Potential Impact
- **Claimed Root Cause**:
  Firebase Realtime Database access control rules are managed solely within the Google Firebase Web Console and are not tracked in version control (e.g., as `database.rules.json`).
- **Potential Security Impact**:
  If the live cloud database uses default testing rules (`{ "rules": { ".read": true, ".write": true } }`) or general authentication rules (`{ "rules": { ".read": "auth != null", ".write": "auth != null" } }`), any authenticated user could read or overwrite any other user's private farm records, plot boundaries, and profile information.

### 3. Exact Blocker
The live Firebase Realtime Database security rules are deployed on Google cloud servers. Local repository static analysis cannot verify what rules are currently active in the production Firebase project.

### 4. Bounded Local Next Step
1. Create a `database.rules.json` file in the root of the project with strict path-level authorization:
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}
```
2. Initialize Firebase Local Emulator Suite (`firebase emulators:start --only database`) and run automated test fixtures verifying cross-user access rejections.

### 5. Safe Owner-Observed Deployment Check (Read-Only)
The project owner should execute one of the following safe checks:
1. **Firebase CLI Inspection**:
   Run the following read-only command from the terminal:
   ```bash
   npx firebase-tools database:get /.settings/rules
   ```
2. **Firebase Console Web Inspection**:
   - Navigate to [Firebase Console](https://console.firebase.google.com/) -> Select Project `farmwise-be0bd`.
   - Go to **Build** -> **Realtime Database** -> Click the **Rules** tab.
   - Confirm that rules under `users/$uid` strictly require `auth.uid === $uid`.
