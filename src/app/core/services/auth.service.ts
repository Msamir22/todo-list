import { Injectable } from '@angular/core';
import { FirebaseError } from '@angular/fire/app';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
  AngularFirestore,
  AngularFirestoreDocument,
} from '@angular/fire/compat/firestore';
import { Router } from '@angular/router';
import firebase from 'firebase/compat/app';
import { map } from 'rxjs';
import { UserDocument } from 'src/app/utils/firestore.types';
import { AuthFormFields } from '../auth/auth.component';
import { ToastService } from './toast.service';

enum AuthErrorCodes {
  EMAIL_EXISTS = 'auth/email-already-in-use',
  INVALID_CREDENTIALS = 'auth/invalid-login-credentials',
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private constructor(
    private readonly afAuth: AngularFireAuth,
    private readonly afs: AngularFirestore,
    private readonly router: Router,
    private readonly toastService: ToastService
  ) {
    /* Saving user data in localstorage when logged in and remove it when logged out */
    this.afAuth.authState.subscribe((user) => {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    });
  }

  public get currentUser(): UserDocument {
    return JSON.parse(localStorage.getItem('user')!);
  }

  public readonly currentUser$ = this.afAuth.authState;

  public readonly isLoggedIn$ = this.currentUser$.pipe(map((user) => !!user));

  public signIn(signInInfo: AuthFormFields): void {
    const { email, password } = signInInfo;

    this.afAuth
      .signInWithEmailAndPassword(email, password)
      .then(() => {
        this.router.navigate(['/']);
      })
      .catch((error: FirebaseError) => {
        this.toastService.show(`${extractFirebaseErrorMessage(error)}`, {
          success: false,
        });
      });
  }

  public signUp(signUpInfo: AuthFormFields): void {
    const { email, password } = signUpInfo;

    this.afAuth
      .createUserWithEmailAndPassword(email, password)
      .then((userCred) => {
        if (userCred.user) {
          this.SetUserData(userCred.user);
        }
        this.router.navigate(['/']);
      })
      .catch((error: FirebaseError) => {
        this.toastService.show(`${extractFirebaseErrorMessage(error)}`, {
          success: false,
        });
      });
  }

  public logOut(): void {
    this.afAuth.signOut().then(() => {
      localStorage.removeItem('user');
      this.router.navigate(['/auth/signin']);
    });
  }

  private SetUserData(user: firebase.User) {
    const userRef: AngularFirestoreDocument<UserDocument> = this.afs.doc(
      `users/${user.uid}`
    );

    const userData: UserDocument = {
      uid: user.uid,
      email: user.email,
    };

    return userRef.set(userData, {
      merge: true,
    });
  }
}

function extractFirebaseErrorMessage(error: FirebaseError): string {
  return error.message.split(':')[1].split('(')[0];
}
