# HydraBand

Sweat-sensing hydration band. ECE Senior Design, Spring 2026, Georgia Tech. (Fictional demo project for GT Swarm.)

HydraBand estimates sweat loss and sodium concentration for outdoor workers and athletes. Firmware runs on an nRF52 with Zephyr RTOS and streams over BLE to a React Native app.

## Hardware
- Flexible PCB design with a sweat conductivity front end
- PPG sensor and accelerometer
- 120 mAh battery, 3.5 days per charge

## Problems solved
- Sweat sodium readings drifted as the electrode dried out, so we fixed it by adding a hydrogel layer and recalibrating the baseline every ten minutes.
- Battery life was under a day, so we solved it by duty-cycling the sensor front end and batching BLE notifications every 30 seconds.

## Known issue
- The BLE connection drops when the band enters sleep mode between readings.
