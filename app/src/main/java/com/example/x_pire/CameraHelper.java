package com.example.x_pire;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.os.Build;
import android.provider.MediaStore;
import android.widget.Toast;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.Manifest;

public class CameraHelper {

    private static final int REQUEST_CODE = 22;
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 101;
    private static final int MEDIA_PERMISSION_REQUEST_CODE = 102;

    public static void openCamera(Activity activity) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (ContextCompat.checkSelfPermission(activity, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(activity, new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST_CODE);
            } else if (ContextCompat.checkSelfPermission(activity, Manifest.permission.READ_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(activity, Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(activity, new String[]{Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE}, MEDIA_PERMISSION_REQUEST_CODE);
            } else {
                launchCameraIntent(activity);
            }
        } else {
            launchCameraIntent(activity);
        }
    }

    private static void launchCameraIntent(Activity activity) {
        Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (intent.resolveActivity(activity.getPackageManager()) != null) {
            activity.startActivityForResult(intent, REQUEST_CODE);
        } else {
            Toast.makeText(activity, "No camera app found", Toast.LENGTH_SHORT).show();
        }
    }

    public static Bitmap processActivityResult(int requestCode, int resultCode, Intent data) {
        if (requestCode == REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            return (Bitmap) data.getExtras().get("data");
        } else {
            return null;
        }
    }

    public static void onRequestPermissionsResult(Activity activity, int requestCode, String[] permissions, int[] grantResults) {
        if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                launchCameraIntent(activity);
            } else {
                Toast.makeText(activity, "Camera permission denied", Toast.LENGTH_SHORT).show();
            }
        } else if (requestCode == MEDIA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                launchCameraIntent(activity);
            } else {
                Toast.makeText(activity, "Media permission denied", Toast.LENGTH_SHORT).show();
            }
        }
    }
}
