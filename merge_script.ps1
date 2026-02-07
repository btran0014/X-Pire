# Step 1: Commit your current work
Write-Host "Staging current changes on ali-main..." -ForegroundColor Cyan
git add android/app/src/main/java/io/flutter/plugins/GeneratedPluginRegistrant.java ios/Runner/GeneratedPluginRegistrant.m
git commit -m "Update generated plugin registrants"

# Step 2: Checkout main and clean it up
Write-Host "
Switching to main branch..." -ForegroundColor Cyan
git checkout main

# Step 3: Copy the updated .gitignore from ali-main
Write-Host "Updating .gitignore on main..." -ForegroundColor Cyan
git checkout ali-main -- .gitignore

# Step 4: Remove all generated files from tracking on main
Write-Host "Removing generated files from git tracking..." -ForegroundColor Cyan
git rm -r --cached .dart_tool .flutter-plugins-dependencies .vscode .idea .metadata 2>$null

# Step 5: Commit the cleanup
git add .gitignore
git commit -m "Clean up: Remove generated files from tracking and update .gitignore"

# Step 6: Now merge ali-main into main
Write-Host "
Merging ali-main into main..." -ForegroundColor Yellow
git merge ali-main --no-edit

Write-Host "
Done! Check the merge status above." -ForegroundColor Green
