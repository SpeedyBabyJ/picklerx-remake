export default class KalmanFilter {
  private R: number;
  private Q: number;
  private A: number;
  private B: number;
  private C: number;
  private cov: number;
  private x: number;

  constructor({ R = 0.01, Q = 3 } = {}) {
    this.R = R;
    this.Q = Q;
    this.A = 1;
    this.B = 0;
    this.C = 1;
    this.cov = NaN;
    this.x = NaN;
  }
  
  filter(z: number): number {
    if (isNaN(this.x)) this.x = (1 / this.C) * z;
    else {
      const predX = (this.A * this.x);
      const predCov = ((this.A * this.cov * this.A) + this.R);
      const K = predCov * this.C * (1 / ((this.C * predCov * this.C) + this.Q));
      this.x = predX + K * (z - (this.C * predX));
      this.cov = predCov - (K * this.C * predCov);
    }
    return this.x;
  }
}
