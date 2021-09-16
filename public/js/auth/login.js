/* eslint-disable */
import axios from 'axios';

export const signup = async (name, email, password, passwordConfirm) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/signup',
      data: {
        name,
        email,
        password,
        passwordConfirm
      }
    });

    console.log(123)

    if (res.data.status === 'success') {
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    console.log('error', err)
  }
};

export const login = async (email, password, $form) => {
  try {
    const res = await axios({
      method: 'POST',
      url: '/api/v1/users/login',
      data: {
        email,
        password
      }
    });

    if (res.data.status === 'success') {
      window.setTimeout(() => {
        location.assign('/');
      }, 1500);
    }
  } catch (err) {
    $form.append(`<p>${err.message}</p>`)
    console.log('error', err)
  }
};

export const logout = async () => {
   try {
     const res = await axios({
       method: 'GET',
       url: '/api/v1/users/logout'
     });

     //reload the same page
     if (res.data.status === 'success') location.assign('/login');
   } catch (err) {
     console.log('Error logging out', err)
   }
 };

 export const requestPasswordReset = async (email, $form) => {
   try {
     const res = await axios({
       method: 'POST',
       url: '/api/v1/users/forgotPassword',
       data: {
        email
      }
     });

     if (res.data.status === 'success') $form.append(`<p>${res.data.message}</p>`)
   } catch (err) {
     console.log('Error logging out', err)
   }
 };

 export const resetPassword = async (password, passwordConfirm, $form) => {
  const url_string = window.location.href.split('/');
  const token = url_string[url_string.length - 1 ];

  try {
  const res = await axios({
    method: 'PATCH',
    url: `/api/v1/users/reset-password/${token}`,
    data: {
    password,
    passwordConfirm
  }
  });

  if (res.data.status === 'success') {
    // todo give user feedback about success
    console.log("Your password is reset successfully")
    location.assign('/');
  }
  
  } catch (err) {
  $form.append(`<p>${err.message}</p>`);
    console.log('Error logging out', err);
  }
 };

 export const updatePassword = async (email, passwordCurrent, password, passwordConfirm, $form) => {
   try {
     const res = await axios({
       method: 'PATCH',
       url: '/api/v1/users/updateMyPassword',
       data: {
        email,
        passwordCurrent,
        password,
        passwordConfirm
      }
     });
     //reload the same page
    if (res.data.status === 'success') location.reload(); // TODO: get response to give user feed back

   } catch (err) {
     $form.append(`<p>${err.message}</p>`);
   }
 };

 // TODO: endpoint where user can update their information
//  export const updateUser = async (name, $form) => {
//    try {
//      const res = await axios({
//        method: 'PATCH',
//        url: '/api/v1/users/',
//        data: { name }
//      });
//      //reload the same page
//     if (res.data.status === 'success') location.reload(''); 

//    } catch (err) {
//      $form.append(`<p>${err.message}</p>`);
//    }
//  };