document.getElementById('updateButton').addEventListener('click', function () {
    var form = document.getElementById('userActionForm');
    form.action = '/updateUserRole?_method=PUT';
    form.submit();
});

document.getElementById('deleteButton').addEventListener('click', function () {
    var form = document.getElementById('userActionForm');
    form.action = '/deleteUser?_method=DELETE';
    form.submit();
});
